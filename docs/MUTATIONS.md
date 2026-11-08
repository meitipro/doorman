# Mutations

Written by `python scripts/mutate.py --table docs/MUTATIONS.md`. 71 defences in
`contracts/doorman.py` were each broken on their own, and every mutant was caught. Each row
names the first test that failed against it, read from pytest's report rather than an exit code.
The generated-files, frozen-deployment, browser-parity and private-key tests are excluded,
because the first three fail for any edit at all and the last reads files, not the contract.

One check is deliberately not mutated: the validator's test that the leader's payload is a dict
with a string `labels`. The labels comparison right below it already refuses anything else, so no
test can tell the two apart; it stays so the validator never depends on how the runtime treats an
exception raised inside it.

| # | defence broken | caught by |
|---|---|---|
| 1 | update_gate: any account may update | `tests/test_direct.py::test_only_the_owner_may_update` |
| 2 | submit: any account may submit for an applicant | `tests/test_direct.py::test_only_the_applicant_may_submit` |
| 3 | open_gate: the gate is owned by a fixed address | `tests/test_direct.py::test_open_gate_records_the_gate_and_its_owner` |
| 4 | apply: the attempt is not bound to the applicant | `tests/test_direct.py::test_an_open_attempt_keeps_the_version_it_was_dealt` |
| 5 | withdraw: pays a fixed address | `tests/test_direct.py::test_withdraw_pays_the_applicant_their_fee_back` |
| 6 | judge: the caller is not recorded | `tests/test_direct.py::test_judge_is_open_to_anyone_and_records_who_called` |
| 7 | expire: the caller is not recorded | `tests/test_direct.py::test_expire_closes_a_late_attempt_and_counts_it` |
| 8 | apply: any fee is accepted | `tests/test_direct.py::test_apply_refuses_the_wrong_fee` |
| 9 | withdraw: the balance is not zeroed | `tests/test_direct.py::test_withdraw_pays_the_applicant_their_fee_back` |
| 10 | withdraw: an empty balance still sends | `tests/test_direct.py::test_a_fee_of_zero_is_no_money_at_all` |
| 11 | passed: the fee is not credited back | `tests/test_direct.py::test_passed_credits_the_fee_back_to_the_applicant` |
| 12 | failed: the fee is not credited to the pool | `tests/test_direct.py::test_retry_sends_the_fee_to_the_pool` |
| 13 | passed: the fee destination is not recorded | `tests/test_direct.py::test_passed_credits_the_fee_back_to_the_applicant` |
| 14 | passed: the refunded total is not counted | `tests/test_direct.py::test_passed_credits_the_fee_back_to_the_applicant` |
| 15 | failed: the pool total is not counted | `tests/test_direct.py::test_retry_sends_the_fee_to_the_pool` |
| 16 | credit: a balance is overwritten, not added to | `tests/test_direct.py::test_the_third_failure_locks_for_seven_days` |
| 17 | verdict: needs more than the pass mark | `tests/test_direct.py::test_an_applicant_cannot_apply_again_after_a_pass` |
| 18 | verdict: one pass is enough | `tests/test_direct.py::test_the_verdict_is_computed_in_code_from_the_labels` |
| 19 | passed: no pass is recorded | `tests/test_direct.py::test_an_applicant_cannot_apply_again_after_a_pass` |
| 20 | passed: the gate does not count it | `tests/test_direct.py::test_a_pass_is_two_of_three_when_the_mark_is_two` |
| 21 | passed: the contract does not count it | `tests/test_direct.py::test_a_pass_is_two_of_three_when_the_mark_is_two` |
| 22 | close: the open attempt is never cleared | `tests/test_direct.py::test_retry_starts_the_cooldown_and_shows_the_attempts_left` |
| 23 | close: a third failure does not lock the status | `tests/test_direct.py::test_the_third_failure_locks_for_seven_days` |
| 24 | close: a lock is not counted | `tests/test_direct.py::test_the_third_failure_locks_for_seven_days` |
| 25 | close: a retry is not counted | `tests/test_direct.py::test_retry_sends_the_fee_to_the_pool` |
| 26 | close: an expired attempt does not count toward the lock | `tests/test_direct.py::test_expired_counts_toward_the_lock` |
| 27 | close: a failure starts no cooldown | `tests/test_direct.py::test_retry_starts_the_cooldown_and_shows_the_attempts_left` |
| 28 | open_gate: a pass mark of 1 is accepted | `tests/test_direct.py::test_open_gate_refuses_out_of_range_settings[kwargs5-pass` |
| 29 | open_gate: any fee is accepted | `tests/test_direct.py::test_open_gate_refuses_out_of_range_settings[kwargs7-fee` |
| 30 | open_gate: any time limit is accepted | `tests/test_direct.py::test_open_gate_refuses_out_of_range_settings[kwargs9-time` |
| 31 | open_gate: any cooldown is accepted | `tests/test_direct.py::test_open_gate_refuses_out_of_range_settings[kwargs11-cooldown` |
| 32 | bank: forty questions are accepted | `tests/test_direct.py::test_the_bank_has_six_to_twenty_questions` |
| 33 | bank: three questions are accepted | `tests/test_direct.py::test_the_bank_has_six_to_twenty_questions` |
| 34 | bank: duplicate questions are accepted | `tests/test_direct.py::test_the_bank_refuses_bad_questions[<lambda>-two` |
| 35 | open_gate: the 3,000-character handbook cap is gone | `tests/test_direct.py::test_open_gate_refuses_out_of_range_settings[kwargs4-handbook` |
| 36 | bank: the 100-character question cap is gone | `tests/test_direct.py::test_the_bank_refuses_bad_questions[<lambda>-a` |
| 37 | bank: the 300-character rubric cap is gone | `tests/test_direct.py::test_the_bank_refuses_bad_questions[<lambda>-a` |
| 38 | submit: the 600-character answer cap is gone | `tests/test_direct.py::test_submit_needs_three_answers_of_at_most_600_characters` |
| 39 | apply: the Discord id is not checked | `tests/test_direct.py::test_apply_checks_the_gate_and_the_discord_id` |
| 40 | rules: five attempts per round | `tests/test_direct.py::test_retry_starts_the_cooldown_and_shows_the_attempts_left` |
| 41 | rules: the lock lasts six days | `tests/test_direct.py::test_the_third_failure_locks_for_seven_days` |
| 42 | apply: the cooldown is not checked | `tests/test_direct.py::test_retry_starts_the_cooldown_and_shows_the_attempts_left` |
| 43 | apply: the lock is not checked | `tests/test_direct.py::test_the_third_failure_locks_for_seven_days` |
| 44 | apply: two attempts can be open at once | `tests/test_direct.py::test_one_open_attempt_at_a_time` |
| 45 | apply: a passed applicant can pay again | `tests/test_direct.py::test_an_applicant_cannot_apply_again_after_a_pass` |
| 46 | apply: a new round never starts | `tests/test_direct.py::test_a_new_round_opens_when_the_lock_ends_with_new_questions` |
| 47 | apply: a new round repeats the old questions | `tests/test_direct.py::test_a_new_round_opens_when_the_lock_ends_with_new_questions` |
| 48 | apply: the deadline is twice the time limit | `tests/test_direct.py::test_apply_opens_an_attempt_with_the_exact_fee` |
| 49 | submit: answers after the deadline are stored | `tests/test_direct.py::test_submit_after_the_deadline_is_refused` |
| 50 | submit: answers can be replaced | `tests/test_direct.py::test_answers_can_not_be_replaced` |
| 51 | expire: an attempt expires before its deadline | `tests/test_direct.py::test_expire_before_the_deadline_is_refused` |
| 52 | expire: an answered attempt can be expired | `tests/test_direct.py::test_expire_is_for_attempts_waiting_for_answers` |
| 53 | judge: an attempt without answers is graded | `tests/test_direct.py::test_judge_refuses_an_attempt_without_answers` |
| 54 | update_gate: the version is not bumped | `tests/test_direct.py::test_update_bumps_the_version_and_changes_the_text` |
| 55 | judge: an open attempt is graded against the live handbook | `tests/test_direct.py::test_an_open_attempt_keeps_the_version_it_was_dealt` |
| 56 | apply: the attempt does not copy its questions | `tests/test_direct.py::test_an_open_attempt_keeps_the_version_it_was_dealt` |
| 57 | apply: the Discord id is not kept on the standing | `tests/test_direct.py::test_the_pass_carries_the_discord_id_of_the_attempt_that_passed` |
| 58 | apply: the attempt is not indexed for the applicant | `tests/test_direct.py::test_each_applicant_has_their_own_standing` |
| 59 | deal: the address case matters | `tests/test_direct.py::test_dealing_ignores_the_case_of_the_address` |
| 60 | deal: the order ignores the hash | `tests/test_direct.py::test_dealing_matches_the_spec_formula` |
| 61 | deal: only two questions are dealt | `tests/test_direct.py::test_dealing_matches_the_spec_formula` |
| 62 | judge: the fence lets delimiters through | `tests/test_direct.py::test_answers_are_fenced_in_the_prompt` |
| 63 | judge: the handbook is not fenced | `tests/test_direct.py::test_the_handbook_is_fenced_too` |
| 64 | judge: answers are not fenced | `tests/test_direct.py::test_answers_are_fenced_in_the_prompt` |
| 65 | judge: questions are not fenced | `tests/test_direct.py::test_question_and_rubric_are_fenced_too` |
| 66 | judge: rubrics are not fenced | `tests/test_direct.py::test_question_and_rubric_are_fenced_too` |
| 67 | judge: validators agree with any answer | `tests/test_direct.py::test_validators_must_agree_on_the_three_labels` |
| 68 | judge: validators compare the first label only | `tests/test_direct.py::test_validators_must_agree_on_the_three_labels` |
| 69 | judge: an unreadable label defaults to PASS | `tests/test_direct.py::test_an_unreadable_answer_is_never_a_label[{"labels":` |
| 70 | judge: any number of labels is accepted | `tests/test_direct.py::test_an_unreadable_answer_is_never_a_label[{"labels":` |
| 71 | judge: a formatting slip is never retried | `tests/test_direct.py::test_a_formatting_slip_gets_exactly_one_retry` |
