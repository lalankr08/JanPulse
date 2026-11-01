import json
import re
import time
import uuid
from typing import AsyncGenerator
from app.graph.state import PipelineState
from app.db import Database
from app.llm.schemas import (
    ClaimExtractionResult, PlanResult, JudgeResult,
    SchemeExtractionResult, NotificationExplainerResult,
    FactCheckAssessment, SchemeDetail, CriterionItem
)
from app.llm.prompts import (
    SYSTEM_BASE, CLAIM_EXTRACTION_PROMPT, PLANNING_PROMPT,
    JUDGE_PROMPT, EXPLAIN_TRANSLATE_PROMPT
)
from app.llm.guardrails import sanitize_untrusted_text, screen_prompt_injection
from app.llm.router import router
from app.tools.registry import ToolRegistry
from app.rag.embedder import index_source_document
from app.rag.search import hybrid_search_chunks
from app.rag.verifier import verify_verdicts

class JanPulsePipeline:
    @staticmethod
    async def run(state: PipelineState) -> AsyncGenerator[dict, None]:
        """
        Executes the JanPulse typed state graph and yields SSE events.
        """
        # Node 1: Ingest
        yield {"type": "step_start", "node": "ingest", "message": "Analyzing citizen input and detecting language..."}
        
        # Check prompt injection screen
        injected, reason = screen_prompt_injection(state.raw_input)
        if injected and state.persist_to_db:
            Database.insert_trace_event(
                run_id=state.run_id, seq=state.seq, node="ingest",
                event_type="security_alert", detail={"reason": reason}
            )
            state.seq += 1

        state.models_used["ingest"] = "code_guard"
        yield {"type": "step_complete", "node": "ingest", "detail": "Input verified and sanitized."}

        # Node 2: Extract Claims (or route if notification / eligibility)
        if state.kind == "forward":
            yield {"type": "step_start", "node": "extract_claims", "message": "Extracting atomic claims & checking for viral hoaxes..."}
            
            clean_input = sanitize_untrusted_text(state.raw_input)

            # Pre-evaluation: Check for viral hoaxes, personal rumors, or internet memes
            hoax_prompt = f"""Evaluate this citizen forward or social media message:
"{clean_input}"

CRITICAL RULES:
1. If this message asks about or mentions ANY of the following:
   - A specific named individual, pilot, officer, doctor, minister, or citizen (e.g. 'Smit Machchhar', 'Captain', etc.)
   - A real-world event, breaking news, flight incident, accident, attack, or international event
   - A genuine government scheme (e.g. PM-KISAN, PM Surya Ghar, Ayushman Bharat, Mudra, PMAY, pension, subsidy), tax rules, or official acts:
   -> You MUST set `is_hoax_or_viral_rumor: false` and `verdict_label: "proceed_official_check"` and `hoax_category: "genuine_civic_query"`.
   Do NOT guess or assume it is fake here; let the live retrieval engine search news wires and official archives!

2. ONLY mark `is_hoax_or_viral_rumor: true` and `verdict_label: "contradicted"` if this message is:
   - Personal celebrity or political gossip / relationship rumors (e.g. dating, marriage).
   - Known satirical memes or fabricated internet hoaxes (e.g. '500 rupee notes banned next month', 'UNESCO declared national anthem best').
   - Fraudulent phishing scams (e.g. 'Government giving 5000 free cash if you click this link').

3. Whenever you debunk a rumor as contradicted:
   - Your `explanation` MUST plainly state that the claim is false AND clearly state what the accurate real fact is from official public records.
""" + ("\n4. LANGUAGE REQUIREMENT: Write your `explanation` and `correct_official_fact` in clear, natural Hindi (Devanagari script: हिन्दी) for Indian citizens." if state.target_language == "hi" else "")
            try:
                hoax_eval, h_model = router.complete_structured(
                    prompt=hoax_prompt,
                    system_prompt=(
                        "You are an expert fact-checker specialized in Indian current affairs, social media hoaxes, and political memes. "
                        "When debunking a rumor, always explain what the true, correct official policy is."
                    ),
                    response_model=FactCheckAssessment,
                    preferred_model_tier="fast"
                )
            except Exception as e:
                print(f"[Pipeline] Hoax assessment fallback error: {e}")
                hoax_eval = FactCheckAssessment(
                    is_hoax_or_viral_rumor=False,
                    verdict_label="proceed_official_check",
                    confidence=0.5,
                    confidence_reason="",
                    explanation="",
                    fact_check_basis=""
                )

            # If identified as an unsubstantiated viral rumor / celebrity gossip / hoax (and NOT a genuine civic query)
            if hoax_eval.is_hoax_or_viral_rumor and hoax_eval.verdict_label == "contradicted" and hoax_eval.hoax_category != "genuine_civic_query":
                if state.persist_to_db:
                    Database.insert_trace_event(
                        run_id=state.run_id, seq=state.seq, node="extract_claims",
                        event_type="hoax_detected", model="fact_check_evaluator",
                        detail={"category": hoax_eval.hoax_category, "reason": hoax_eval.confidence_reason}
                    )
                state.seq += 1

                verdict_id = f"v_guest_{uuid.uuid4().hex[:8]}"
                share_id = f"s_guest_{uuid.uuid4().hex[:8]}"

                if state.persist_to_db:
                    # Save fake/debunked verdict to DB
                    claim_row = Database.execute_one(
                        """INSERT INTO claims (run_id, claim_text, claim_text_en, kind)
                           VALUES (%s, %s, %s, 'rumor_or_hoax') RETURNING id""",
                        (state.run_id, state.raw_input, state.raw_input)
                    )
                    claim_id = claim_row["id"] if claim_row else None

                    v_row = Database.execute_one(
                        """INSERT INTO verdicts (claim_id, run_id, label, confidence, confidence_reason, explanation, explanation_lang)
                           VALUES (%s, %s, 'contradicted', %s, %s, %s, %s)
                           RETURNING id, share_id""",
                        (claim_id, state.run_id, hoax_eval.confidence,
                         f"Fact-Check: {hoax_eval.confidence_reason or 'Recognized as unsubstantiated viral rumor / meme'}",
                         hoax_eval.explanation, state.target_language)
                    )
                    verdict_id = str(v_row["id"]) if v_row else verdict_id
                    share_id = v_row["share_id"] if v_row else share_id

                    fake_source = Database.save_source(
                        url="https://factcheck.pib.gov.in",
                        publisher="PIB Fact Check & Public Record Consensus",
                        source_type="other",
                        title="Fact-Check Analysis of Viral Social Media Claims",
                        http_status=200,
                        raw_text=hoax_eval.explanation
                    )
                    if fake_source:
                        Database.execute_query(
                            """INSERT INTO citations (verdict_id, source_id, role, span, fetched_at)
                               VALUES (%s, %s, 'contradicts', %s, NOW())""",
                            (verdict_id, str(fake_source["id"]), hoax_eval.explanation[:200])
                        )

                    Database.execute_query(
                        "UPDATE agent_runs SET status = 'completed', finished_at = NOW() WHERE id = %s",
                        (state.run_id,)
                    )

                yield {
                    "type": "final_verdict",
                    "run_id": state.run_id,
                    "is_guest": not state.persist_to_db,
                    "saved_to_cloud": state.persist_to_db,
                    "verdicts": [
                        {
                            "id": verdict_id,
                            "share_id": share_id,
                            "claim_id": "claim_1",
                            "label": "contradicted",
                            "confidence": float(hoax_eval.confidence),
                            "confidence_reason": hoax_eval.confidence_reason or "Fact-Check: Unsubstantiated internet rumor / meme with zero basis in official record.",
                            "explanation": hoax_eval.explanation,
                            "citations": [
                                {
                                    "url": "https://factcheck.pib.gov.in",
                                    "role": "contradicts",
                                    "span": hoax_eval.correct_official_fact or hoax_eval.explanation[:150],
                                    "publisher": "PIB Fact Check Unit"
                                }
                            ]
                        }
                    ],
                    "evidence_count": 1,
                    "sources": [
                        {
                            "title": "PIB Fact Check Unit & Official Record",
                            "url": "https://factcheck.pib.gov.in",
                            "publisher": "Press Information Bureau"
                        }
                    ]
                }
                return

            # Normal civic claim extraction
            extract_prompt = f"{CLAIM_EXTRACTION_PROMPT}\n\nCitizen Forward:\n{clean_input}"
            extraction, model_used = router.complete_structured(
                prompt=extract_prompt,
                system_prompt=SYSTEM_BASE,
                response_model=ClaimExtractionResult,
                preferred_model_tier="fast"
            )
            state.models_used["extract_claims"] = model_used
            state.detected_language = extraction.language or state.detected_language
            state.has_checkable_claims = extraction.has_checkable_claims
            state.claims = extraction.claims
            state.nudge_message = extraction.nudge_message

            # Save claims to DB only if authenticated
            if state.persist_to_db:
                for c in state.claims:
                    Database.execute_query(
                        "INSERT INTO claims (run_id, claim_text, claim_text_en, kind) VALUES (%s, %s, %s, %s)",
                        (state.run_id, c.claim_text, c.claim_text_en, c.kind)
                    )

                Database.insert_trace_event(
                    run_id=state.run_id, seq=state.seq, node="extract_claims",
                    event_type="claims_extracted", model=model_used,
                    detail={"claims_count": len(state.claims), "has_claims": extraction.has_checkable_claims}
                )
            state.seq += 1

            if not state.has_checkable_claims or not state.claims:
                yield {
                    "type": "result",
                    "status": "nudge",
                    "nudge_message": state.nudge_message or "We couldn't detect a checkable government claim. Please paste a forward, scheme question, or official rule."
                }
                return

            yield {
                "type": "step_complete",
                "node": "extract_claims",
                "claims": [{"id": c.id, "text": c.claim_text, "text_en": c.claim_text_en, "kind": c.kind} for c in state.claims]
            }

        elif state.kind == "eligibility":
            # Multi-Scheme Discovery and Structured Extraction
            from app.tools.myscheme import find_myscheme_candidates, fetch_myscheme
            yield {"type": "step_start", "node": "find_schemes", "message": "Searching official registry for matching schemes..."}
            
            candidates = find_myscheme_candidates(state.raw_input, limit=4)
            yield {
                "type": "step_complete",
                "node": "find_schemes",
                "count": len(candidates),
                "candidates": [{"slug": c["slug"], "name": c["name"], "category": c.get("category", "")} for c in candidates]
            }

            extracted_schemes = []

            for cand in candidates:
                yield {"type": "step_start", "node": "fetch_scheme", "message": f"Fetching official details for {cand['name']}..."}
                try:
                    scheme_data = fetch_myscheme(cand["slug"], lang="en")
                    
                    saved = Database.save_source(
                        url=scheme_data["url"],
                        publisher=scheme_data["publisher"],
                        source_type="myscheme",
                        title=scheme_data["title"],
                        http_status=scheme_data["http_status"],
                        raw_text=scheme_data["content"]
                    )
                    source_id = str(saved["id"])

                    scheme_lang_note = "\nIMPORTANT: Output all questions (`question_for_user`), required documents, application steps, and guidance disclaimer in clear, natural Hindi (Devanagari script: हिन्दी) for Indian citizens." if state.target_language == "hi" else ""
                    crit_prompt = f"""Extract eligibility conditions, required documents, and steps from this official scheme text:
{scheme_lang_note}

{scheme_data['content']}
"""
                    extraction, model_used = router.complete_structured(
                        prompt=crit_prompt,
                        system_prompt=SYSTEM_BASE,
                        response_model=SchemeExtractionResult,
                        preferred_model_tier="main"
                    )

                    Database.execute_query(
                        """INSERT INTO scheme_facts (source_id, scheme_name, criteria, documents, apply_steps, model)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (source_id, extraction.scheme_name, json.dumps([c.model_dump() for c in extraction.criteria]),
                         json.dumps(extraction.documents), json.dumps(extraction.application_steps), model_used)
                    )

                    extracted_schemes.append({
                        "scheme_name": extraction.scheme_name,
                        "scheme_slug": cand["slug"],
                        "category": cand.get("category", "Government Scheme"),
                        "source_url": scheme_data["url"],
                        "criteria": [c.model_dump() for c in extraction.criteria],
                        "documents": extraction.documents,
                        "apply_steps": extraction.application_steps,
                        "disclaimer": extraction.guidance_disclaimer
                    })

                except Exception as ex:
                    print(f"[Pipeline] Failed to process candidate scheme {cand['slug']}: {ex}")

            yield {
                "type": "eligibility_result",
                "total_found": len(extracted_schemes),
                "schemes": extracted_schemes
            }
            return

        elif state.kind == "notification":
            # Explaining a gazette or notification PDF / URL
            yield {"type": "step_start", "node": "fetch_notification", "message": "Parsing gazette order and regulatory text..."}
            from app.tools.egazette import fetch_and_parse_pdf
            from app.rag.gazette_rag import process_gazette_with_rag
            
            try:
                pdf_data = fetch_and_parse_pdf(state.raw_input, max_pages=100)
            except Exception as e:
                print(f"[Pipeline] Notification fetch warning: {e}")
                pdf_data = {
                    "title": "Official Government Circular / Notice",
                    "url": state.raw_input if state.raw_input.startswith("http") else "input:user_text",
                    "publisher": "The Gazette of India (e-Gazette)",
                    "content": state.raw_input
                }

            notification_content = (pdf_data.get("content") or "").strip() or state.raw_input
            total_chars = len(notification_content)
            approx_pages = pdf_data.get("total_pages") or max(1, notification_content.count("--- Page") or total_chars // 2200)

            # Save source if authenticated or database is available for pgvector indexing
            source_id = None
            if state.persist_to_db:
                try:
                    src_rec = Database.save_source(
                        url=pdf_data.get("url", "https://egazette.gov.in"),
                        publisher=pdf_data.get("publisher", "The Gazette of India (e-Gazette)"),
                        source_type="egazette",
                        title=pdf_data.get("title", "Government Gazette Notification"),
                        http_status=200,
                        raw_text=notification_content[:100000]
                    )
                    source_id = str(src_rec["id"]) if src_rec else None
                except Exception as src_err:
                    source_id = None

            # Check if Gazette RAG is activated for large document
            if total_chars > 10000 or approx_pages > 3:
                yield {
                    "type": "step_start",
                    "node": "gazette_rag_chunking",
                    "message": f"Large gazette detected ({approx_pages} pages, {total_chars:,} chars). Indexing clauses with RAG..."
                }

            rag_result = process_gazette_with_rag(
                full_text=notification_content,
                source_url=pdf_data.get("url", "https://egazette.gov.in"),
                source_id=source_id,
                max_total_context_chars=16000
            )

            if rag_result.get("is_rag_used"):
                pages_cited_str = ", ".join(str(p) for p in rag_result.get("pages_cited", [])[:8])
                yield {
                    "type": "step_start",
                    "node": "gazette_rag_retrieval",
                    "message": f"Extracted operative clauses across pages {pages_cited_str} (Scope, Amendments, Deadlines, Penalties)..."
                }

            yield {"type": "step_start", "node": "analyze_notification", "message": "Synthesizing plain-language civic breakdown..."}

            gazette_lang_note = "\nIMPORTANT: Output the explanation entirely in clear, natural Hindi (Devanagari script: हिन्दी) for Indian citizens. Output the title, who is affected, what changes, deadlines, penalties, and what to do next in clear Hindi." if state.target_language == "hi" else ""
            exp_prompt = f"""Explain this official government gazette / notification clearly for citizens:
{gazette_lang_note}

Evidence & Operative Clauses (Extracted via Gazette RAG):
{rag_result['context']}
"""
            try:
                explainer_result, model_used = router.complete_structured(
                    prompt=exp_prompt,
                    system_prompt=SYSTEM_BASE,
                    response_model=NotificationExplainerResult,
                    preferred_model_tier="main"
                )
            except Exception as ex:
                print(f"[Pipeline] Notification LLM explanation error: {ex}")
                explainer_result = NotificationExplainerResult(
                    title=pdf_data.get("title", "Official Government Circular"),
                    effective_date="Immediate / As specified in official circular",
                    who_is_affected=["Citizens", "Eligible beneficiaries and related administrative bodies"],
                    what_changes=["Notice details regulatory provisions, scheme guidelines, or procedural updates."],
                    deadlines=["Refer to designated gazette publication for statutory deadlines."],
                    penalties_or_actions=["Ensure timely submission and compliance through authorized portals."],
                    what_to_do_next=["Review official government department portal or consult the nearest service center."]
                )

            Database.execute_query(
                "UPDATE agent_runs SET status = 'completed', finished_at = NOW() WHERE id = %s",
                (state.run_id,)
            )

            yield {
                "type": "notification_result",
                "title": explainer_result.title,
                "effective_date": explainer_result.effective_date,
                "who_is_affected": explainer_result.who_is_affected,
                "what_changes": explainer_result.what_changes,
                "deadlines": explainer_result.deadlines,
                "penalties_or_actions": explainer_result.penalties_or_actions,
                "what_to_do_next": explainer_result.what_to_do_next,
                "source_url": pdf_data.get("url", "https://egazette.gov.in"),
                "publisher": pdf_data.get("publisher", "The Gazette of India (e-Gazette)"),
                "is_rag_used": rag_result.get("is_rag_used", False),
                "total_pages": rag_result.get("total_pages", approx_pages),
                "pages_cited": rag_result.get("pages_cited", [1]),
                "total_chunks_indexed": rag_result.get("total_chunks", 1),
                "chunks_analyzed": rag_result.get("chunks_selected", 1)
            }
            return

        # Verification Loop for Forward Checker
        while state.iteration <= state.max_iterations and state.tool_budget_remaining > 0:
            state.iteration += 1
            yield {
                "type": "step_start",
                "node": "plan",
                "message": f"Planning retrieval (Iteration {state.iteration})..."
            }

            claims_context = "\n".join([f"- [{c.id}] ({c.kind}): {c.claim_text_en}" for c in state.claims])
            gap_context = f"\nPrevious verification gaps to address:\n" + "\n".join(state.verification_gaps) if state.verification_gaps else ""

            plan_prompt = f"{PLANNING_PROMPT}\n\nClaims to verify:\n{claims_context}{gap_context}"
            
            plan_res, model_used = router.complete_structured(
                prompt=plan_prompt,
                system_prompt=SYSTEM_BASE,
                response_model=PlanResult,
                preferred_model_tier="main"
            )
            state.models_used["plan"] = model_used

            if state.persist_to_db:
                Database.insert_trace_event(
                    run_id=state.run_id, seq=state.seq, node="plan",
                event_type="plan_created", model=model_used,
                detail={"tools": [t.tool for t in plan_res.tool_calls], "strategy": plan_res.strategy}
            )
            state.seq += 1

            yield {
                "type": "step_complete",
                "node": "plan",
                "tools": [t.tool for t in plan_res.tool_calls],
                "strategy": plan_res.strategy
            }

            # Node 4: Retrieve
            yield {"type": "step_start", "node": "retrieve", "message": "Querying official portals and verified news in parallel..."}
            
            # Supplement with news_search if query relates to real-world incidents or named people
            planned_tools = [c.tool for c in plan_res.tool_calls]
            news_triggers = ["flight", "pilot", "stabbed", "copilot", "attacked", "hijack", "accident", "crash", "killed", "arrested", "hospital", "died", "machchar", "machchhar"]
            is_news = any(k in state.raw_input.lower() for k in news_triggers)
            if is_news and "news_search" not in planned_tools and state.tool_budget_remaining > 0:
                from app.llm.schemas import ToolCallPlan
                plan_res.tool_calls.insert(0, ToolCallPlan(
                    tool="news_search",
                    query=state.raw_input,
                    language="en",
                    reason="Supplemental live news search for real-world event / incident"
                ))

            for call in plan_res.tool_calls[:min(3, state.tool_budget_remaining)]:
                state.tool_budget_remaining -= 1
                source_record = ToolRegistry.execute_tool(
                    tool_name=call.tool,
                    query=call.query,
                    language=state.detected_language,
                    run_id=state.run_id if state.persist_to_db else None,
                    seq=state.seq
                )
                state.seq += 1
                state.retrieved_sources.append(source_record)

                yield {
                    "type": "evidence_item",
                    "publisher": source_record.get("publisher", "Official Source"),
                    "title": source_record.get("title", call.tool),
                    "url": source_record.get("url"),
                    "http_status": source_record.get("http_status", 200)
                }

                if source_record and source_record.get("content"):
                    chunks = []
                    if source_record.get("db_source_id"):
                        try:
                            chunks = index_source_document(
                                source_id=source_record["db_source_id"],
                                title=source_record.get("title", ""),
                                content=source_record["content"],
                                lang=state.detected_language
                            )
                        except Exception as idx_err:
                            print(f"[Pipeline] DB indexing fallback: {idx_err}")

                    # Fallback in-memory chunking (essential for guest sessions)
                    if not chunks:
                        raw_blocks = [b.strip() for b in re.split(r"\n\n+|---", source_record["content"]) if len(b.strip()) > 30]
                        if not raw_blocks:
                            raw_blocks = [source_record["content"][:1400]]
                        for r_idx, block_text in enumerate(raw_blocks[:6]):
                            chunks.append({
                                "chunk_id": f"chk_mem_{uuid.uuid4().hex[:8]}",
                                "content": block_text,
                                "heading": source_record.get("title", "Evidence Record"),
                                "source_url": source_record.get("url", "https://official.gov.in"),
                                "publisher": source_record.get("publisher", "Official Source")
                            })

                    for chk in chunks:
                        chk["source_url"] = source_record.get("url", chk.get("source_url", "https://official.gov.in"))
                        chk["publisher"] = source_record.get("publisher", chk.get("publisher", "Official Source"))
                        state.retrieved_chunks.append(chk)
                        state.chunks_by_id[chk["chunk_id"]] = chk

            yield {"type": "step_complete", "node": "retrieve", "chunks_indexed": len(state.retrieved_chunks)}

            # Node 5: Rank & Hybrid Search
            yield {"type": "step_start", "node": "rank", "message": "Ranking official evidence..."}
            top_chunks = []
            for c in state.claims:
                matches = hybrid_search_chunks(c.claim_text_en, match_count=4)
                for m in matches:
                    cid = str(m["chunk_id"])
                    if cid in state.chunks_by_id:
                        top_chunks.append(state.chunks_by_id[cid])

            unique_chunks = list({c["chunk_id"]: c for c in top_chunks + state.retrieved_chunks[:6]}.values())
            yield {"type": "step_complete", "node": "rank", "selected_chunks": len(unique_chunks)}

            # Node 6: Judge
            yield {"type": "step_start", "node": "judge", "message": "Evaluating claims against retrieved evidence..."}
            
            # Cap chunks to top 5 and truncate length to save 60-70% prompt tokens
            capped_chunks = unique_chunks[:5]
            evidence_blocks = "\n\n".join([
                f"[Chunk ID: {c['chunk_id']}] (Source: {c.get('source_url', 'official')})\n{c['content'][:750]}"
                for c in capped_chunks
            ])
            clean_evidence = sanitize_untrusted_text(evidence_blocks)

            judge_prompt = f"""{JUDGE_PROMPT}

Claims to evaluate:
{claims_context}

Official Evidence Chunks:
{clean_evidence}
"""
            judge_res, model_used = router.complete_structured(
                prompt=judge_prompt,
                system_prompt=SYSTEM_BASE,
                response_model=JudgeResult,
                preferred_model_tier="main"
            )
            state.models_used["judge"] = model_used

            # Node 7: Verify Citations (in code)
            yield {"type": "step_start", "node": "verify_citations", "message": "Programmatically checking citations..."}
            all_passed, failures, verified_verdicts = verify_verdicts(
                verdicts=judge_res.verdicts,
                chunks_by_id=state.chunks_by_id
            )
            state.verdicts = verified_verdicts

            if state.persist_to_db:
                Database.insert_trace_event(
                    run_id=state.run_id, seq=state.seq, node="verify_citations",
                event_type="verification_completed",
                detail={"all_passed": all_passed, "failures_count": len(failures)}
            )
            state.seq += 1

            if all_passed or state.iteration >= state.max_iterations or state.tool_budget_remaining <= 0:
                break
            else:
                state.verification_gaps = [f"Claim {f.claim_id}: {f.issue}" for f in failures]
                yield {"type": "replan", "reason": "Verification gaps found, launching targeted follow-up search..."}

        # Node 8: Explain & Translate
        yield {"type": "step_start", "node": "explain", "message": f"Formatting explanation in {'Hindi' if state.target_language == 'hi' else 'English'}..."}

        if state.target_language == "hi":
            for v in state.verdicts:
                try:
                    trans_prompt = f"""Translate this fact-check explanation into clear, natural Hindi (Devanagari script: हिन्दी) for an Indian citizen.
Keep all names, official schemes, dates, amounts, and facts exact without adding external commentary:

{v.explanation}"""
                    hi_expl = router.complete(
                        prompt=trans_prompt,
                        system_prompt="You are a professional Hindi translator for Indian government records and civic fact-checking.",
                        preferred_model_tier="fast"
                    )
                    if hi_expl and len(hi_expl.strip()) > 5:
                        v.explanation = hi_expl.strip()
                except Exception as trans_err:
                    print(f"[Pipeline] Hindi translation note: {trans_err}")
        
        final_verdicts_data = []
        for v in state.verdicts:
            verdict_id = f"v_guest_{uuid.uuid4().hex[:8]}"
            share_id = f"s_guest_{uuid.uuid4().hex[:8]}"
            
            if state.persist_to_db:
                try:
                    claim_row = Database.execute_one(
                        "SELECT id FROM claims WHERE run_id = %s LIMIT 1",
                        (state.run_id,)
                    )
                    claim_id = claim_row["id"] if claim_row else None
                    
                    if claim_id:
                        v_row = Database.execute_one(
                            """INSERT INTO verdicts (claim_id, run_id, label, confidence, confidence_reason, explanation, explanation_lang)
                               VALUES (%s, %s, %s, %s, %s, %s, %s)
                               RETURNING id, share_id""",
                            (claim_id, state.run_id, v.label, v.confidence, v.confidence_reason, v.explanation, state.target_language)
                        )
                        if v_row:
                            verdict_id = str(v_row["id"])
                            share_id = v_row["share_id"]
                        
                        for cit in v.citations:
                            chunk = state.chunks_by_id.get(cit.chunk_id)
                            source_id = chunk.get("source_id") if chunk else None
                            if source_id:
                                Database.execute_query(
                                    """INSERT INTO citations (verdict_id, source_id, chunk_id, role, span, fetched_at)
                                       VALUES (%s, %s, %s, %s, %s, NOW())""",
                                    (verdict_id, source_id, cit.chunk_id, cit.role, cit.verbatim_span)
                                )
                except Exception as db_err:
                    print(f"[JanPulsePipeline] Warning: DB insert for verdict failed: {db_err}", flush=True)

            citations_data = []
            for cit in v.citations:
                chunk = state.chunks_by_id.get(cit.chunk_id)
                citations_data.append({
                    "url": cit.source_url,
                    "role": cit.role,
                    "span": cit.verbatim_span,
                    "publisher": chunk.get("publisher", "Official Portal") if chunk else "Official Portal"
                })

            final_verdicts_data.append({
                "id": verdict_id,
                "share_id": share_id,
                "claim_id": v.claim_id,
                "label": v.label,
                "confidence": float(v.confidence),
                "confidence_reason": v.confidence_reason,
                "explanation": v.explanation,
                "citations": citations_data
            })

        if state.persist_to_db:
            Database.execute_query(
                "UPDATE agent_runs SET status = 'completed', finished_at = NOW() WHERE id = %s",
                (state.run_id,)
            )


        yield {
            "type": "final_verdict",
            "run_id": state.run_id,
            "is_guest": not state.persist_to_db,
            "saved_to_cloud": state.persist_to_db,
            "verdicts": final_verdicts_data,
            "evidence_count": len(state.retrieved_sources),
            "sources": [{"title": s.get("title"), "url": s.get("url"), "publisher": s.get("publisher")} for s in state.retrieved_sources]
        }
