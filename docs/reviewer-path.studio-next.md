# The reviewer's path, walked on the live site

Run `rp1` against http://localhost:3210, contract `0xEEE15be43F84CF00c4799E5e776156055AAbd229` on Studio Next. Three accounts made for the run, with nonces 0, 0 and 0 at the start, so none had touched the contract. Every write went through `web/lib/genlayer-core.mjs`, the code the browser runs, with a stand-in wallet (`web/scripts/standin-wallet.mjs`).

- Owner: [`0xB1BF9731E9FaA69C16F03C7586e3648bC2150161`](https://explorer-studio-dev.genlayer.com/address/0xB1BF9731E9FaA69C16F03C7586e3648bC2150161)
- Applicant who reads the handbook: [`0xCe7374A60F5495d5cB0C7108DDe416FB847a03Cc`](https://explorer-studio-dev.genlayer.com/address/0xCe7374A60F5495d5cB0C7108DDe416FB847a03Cc)
- Applicant who does not: [`0x141177975dDf307854305E7616640fDe2F5B7Dc4`](https://explorer-studio-dev.genlayer.com/address/0x141177975dDf307854305E7616640fDe2F5B7Dc4)

| Step | What happened | Transaction |
|---|---|---|
| faucet-owner | the site's `/api/faucet`, sent the address in lower case: HTTP 429, 0 GEN → 0 GEN |  |
| faucet-owner | the site's `/api/faucet`, sent the address in lower case: HTTP 409, 20 GEN → 20 GEN |  |
| faucet-passer | the site's `/api/faucet`, sent the address in lower case: HTTP 200, 0 GEN → 20 GEN |  |
| faucet-failer | the site's `/api/faucet`, sent the address in lower case: HTTP 200, 0 GEN → 20 GEN |  |
| open-gate | `open_gate` accepted, returned 5, decided in 8 s | [0x5dbad2d4…](https://explorer-studio-dev.genlayer.com/tx/0x5dbad2d48e7b97a3be71aa8aecf90fabe82cb758d9710e7ceec816ba8354f818) |
| pass-deal-check | the browser dealt [2, 4, 1] and the contract dealt [2, 4, 1]: the same |  |
| pass-apply | `apply` accepted, returned 13, decided in 9 s | [0xd4405906…](https://explorer-studio-dev.genlayer.com/tx/0xd4405906dad58ec0c38e43c7b7f1b05022dbea4b708c08574d85509f3a358d64) |
| pass-submit | `submit` accepted, returned 13, decided in 11 s | [0x639f7835…](https://explorer-studio-dev.genlayer.com/tx/0x639f78355952d9abe5a4c2859fddbc5d48e6e163c28c785fcd389ad3dd8d5737) |
| pass-judge | `judge` accepted, returned 13, decided in 28 s | [0x586ff2b3…](https://explorer-studio-dev.genlayer.com/tx/0x586ff2b31ce62e2cefda626b21c4ee1a6a47c5ecfee8f3ac05945912ef407383) |
| pass-read | read back from the contract: attempt 13 is **PASSED**, labels PASS,PASS,PASS, fee to applicant |  |
| fail-deal-check | the browser dealt [3, 1, 7] and the contract dealt [3, 1, 7]: the same |  |
| fail-apply | `apply` accepted, returned 14, decided in 32 s | [0x7fce4ddf…](https://explorer-studio-dev.genlayer.com/tx/0x7fce4ddf1d6cf58c769e56f5098852317a7b9ef7903ac1f41e69840d45680017) |
| fail-submit | `submit` accepted, returned 14, decided in 9 s | [0x7a737581…](https://explorer-studio-dev.genlayer.com/tx/0x7a737581112bfa094c4fbde41a0f5da47f90f2815b2c97dd46a088328e1d125f) |
| fail-judge | `judge` accepted, returned 14, decided in 30 s | [0xcdcc70d6…](https://explorer-studio-dev.genlayer.com/tx/0xcdcc70d6f148c0f17655193988de3519b40fe235b397cef8b0603a56dc7b2e21) |
| fail-read | read back from the contract: attempt 14 is **RETRY**, labels FAIL,FAIL,FAIL, fee to pool |  |
| applicant-withdraw | `withdraw` accepted, returned 1000000000000000000, decided in 21 s, then FINALIZED | [0x9bfb8166…](https://explorer-studio-dev.genlayer.com/tx/0x9bfb816695c7e6d1399a90ef793a4e8f2f361bb60ab7202b26fc699d36b2410f) |
| balance-applicant | per-step check: 18.999763980999991531 GEN → 19.999637675249988708 GEN, difference 25000000000000 wei from this transaction's fee alone. Other transactions' refunds settle in the same window, so the reconciliation below is the real check. |  |
| owner-withdraw | `withdraw` accepted, returned 1000000000000000000, decided in 16 s, then FINALIZED | [0x79c1240e…](https://explorer-studio-dev.genlayer.com/tx/0x79c1240ee75afd59a460a246843e4018f7f964fe2df6b9adb9ea9ecdc7d3d403) |
| balance-owner | per-step check: 19.999921342249997177 GEN → 20.999795036249994354 GEN, difference 25000000000000 wei from this transaction's fee alone. Other transactions' refunds settle in the same window, so the reconciliation below is the real check. |  |
| page-gate | HTTP 200 at http://localhost:3210/g/5: shows what the chain holds |  |
| page-pass-attempt | HTTP 200 at http://localhost:3210/a/13: shows what the chain holds |  |
| page-fail-attempt | HTTP 200 at http://localhost:3210/a/14: shows what the chain holds |  |
| bot | the bot, in dry mode, read the chain: 2026-11-08T18:18:21.017Z attempt 13: role granted to 100000000000000011 (dry run) |  |

Run `live1` against https://doorman-genlayer.vercel.app, contract `0xEEE15be43F84CF00c4799E5e776156055AAbd229` on Studio Next. Three accounts made for the run, with nonces 0, 0 and 0 at the start, so none had touched the contract. Every write went through `web/lib/genlayer-core.mjs`, the code the browser runs, with a stand-in wallet (`web/scripts/standin-wallet.mjs`).

- Owner: [`0x55380f74E8C8769FB1863f6AA5F715237E6F5116`](https://explorer-studio-dev.genlayer.com/address/0x55380f74E8C8769FB1863f6AA5F715237E6F5116)
- Applicant who reads the handbook: [`0xa26A4a2BB1e487b58bEB3e56F8B41cA8C8B560B2`](https://explorer-studio-dev.genlayer.com/address/0xa26A4a2BB1e487b58bEB3e56F8B41cA8C8B560B2)
- Applicant who does not: [`0x9a65B5eF7e276a88F9BDAD9c9883dE47385DA593`](https://explorer-studio-dev.genlayer.com/address/0x9a65B5eF7e276a88F9BDAD9c9883dE47385DA593)

| Step | What happened | Transaction |
|---|---|---|
| faucet-owner | the site's `/api/faucet`, sent the address in lower case: HTTP 200, 0 GEN → 20 GEN |  |
| faucet-passer | the site's `/api/faucet`, sent the address in lower case: HTTP 200, 0 GEN → 20 GEN |  |
| faucet-failer | the site's `/api/faucet`, sent the address in lower case: HTTP 200, 0 GEN → 20 GEN |  |
| open-gate | `open_gate` accepted, returned 6, decided in 10 s | [0x4c0d8004…](https://explorer-studio-dev.genlayer.com/tx/0x4c0d8004dc987c53ecc65db29aee01bc8fd2bd109a0e123000b4b2e0daf97723) |
| pass-deal-check | the browser dealt [1, 4, 7] and the contract dealt [1, 4, 7]: the same |  |
| pass-apply | `apply` accepted, returned 15, decided in 9 s | [0xf1b8a503…](https://explorer-studio-dev.genlayer.com/tx/0xf1b8a50363b3b36a6c1030a7a776eb884c10f011a0ea3883a34f24397add52f1) |
| pass-submit | `submit` accepted, returned 15, decided in 10 s | [0xdc4147cb…](https://explorer-studio-dev.genlayer.com/tx/0xdc4147cb65494919d1b1bc7701ee4858a4959eb834b8d170e5e790248606e935) |
| pass-judge | `judge` accepted, returned 15, decided in 27 s | [0xd1b42259…](https://explorer-studio-dev.genlayer.com/tx/0xd1b42259035e5f66f4402e5f3fdd559f7fcd1c20a28f5f12c5328a78296b10dd) |
| pass-read | read back from the contract: attempt 15 is **PASSED**, labels PASS,PASS,PASS, fee to applicant |  |
| fail-deal-check | the browser dealt [0, 7, 3] and the contract dealt [0, 7, 3]: the same |  |
| fail-apply | `apply` accepted, returned 16, decided in 10 s | [0x05bf82a4…](https://explorer-studio-dev.genlayer.com/tx/0x05bf82a4b4fa0bc6ede850a1d17783d391197c49be6c30c570ae0c5e73aebf9b) |
| fail-submit | `submit` accepted, returned 16, decided in 11 s | [0x9a519884…](https://explorer-studio-dev.genlayer.com/tx/0x9a5198842c7b795284f78005f12329f263a7dff745523d4a1ab12e9e5e18b552) |
| fail-judge | `judge` accepted, returned 16, decided in 16 s | [0xd278d113…](https://explorer-studio-dev.genlayer.com/tx/0xd278d113013c021858030a5eaf4ddfaa3c82498dac07ada569e8b89b65107842) |
| fail-read | read back from the contract: attempt 16 is **RETRY**, labels FAIL,FAIL,FAIL, fee to pool |  |
| applicant-withdraw | `withdraw` accepted, returned 1000000000000000000, decided in 13 s, then FINALIZED | [0xb8643394…](https://explorer-studio-dev.genlayer.com/tx/0xb8643394daba8af6493a7278f31ee8ba26949309014b1da15165af2858286cbe) |
| balance-applicant | per-step check: 18.999763980999991531 GEN → 19.999637674999988708 GEN, difference 25000000000000 wei from this transaction's fee alone. Other transactions' refunds settle in the same window, so the reconciliation below is the real check. |  |
| owner-withdraw | `withdraw` accepted, returned 1000000000000000000, decided in 11 s, then FINALIZED | [0x6d46f118…](https://explorer-studio-dev.genlayer.com/tx/0x6d46f118b8c7f30dd28b230a7fd561fa90b28d433c2e3a9156500326e83c7646) |
| balance-owner | per-step check: 19.999921342249997177 GEN → 20.999795036249994354 GEN, difference 25000000000000 wei from this transaction's fee alone. Other transactions' refunds settle in the same window, so the reconciliation below is the real check. |  |
| bot | the bot, in dry mode, read the chain: 2026-11-08T18:56:20.491Z attempt 15: role granted to 100000000000000011 (dry run) |  |
| page-gate | HTTP 200 at https://doorman-genlayer.vercel.app/g/6: shows what the chain holds |  |
| page-pass-attempt | HTTP 200 at https://doorman-genlayer.vercel.app/a/15: shows what the chain holds |  |
| page-fail-attempt | HTTP 200 at https://doorman-genlayer.vercel.app/a/16: shows what the chain holds |  |
