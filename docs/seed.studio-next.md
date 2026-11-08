# Seed

Written by `python scripts/seed.py` against the Doorman contract [`0xEEE15be43F84CF00c4799E5e776156055AAbd229`](https://explorer-studio-dev.genlayer.com/address/0xEEE15be43F84CF00c4799E5e776156055AAbd229) on Studio Next. Every verdict below was produced by the deployed judge through real consensus, and the script recorded what the contract said, not what was hoped.

The communities (Kiln, Quill), the handbook and the people are fictional and exist only for this demonstration. The Discord ids are placeholders that belong to nobody. The accounts are test accounts.

## Attempts

| Applicant | Gate | Attempt | Result | Labels | Applied | Closed |
|---|---|---|---|---|---|---|
| `0xEdE90DEd…` (ada) | Kiln Discord | 9 | **PASSED** | PASS,PASS,PASS | [0x80c61785…](https://explorer-studio-dev.genlayer.com/tx/0x80c61785dec18340f18a7037ddb1946c4c80f58e6367def2b80cd5d3a7b075a5) | [0x3e786868…](https://explorer-studio-dev.genlayer.com/tx/0x3e7868685199298f4477d8f6605538a107a956f8b55ba4588664130bcd888a49) |
| `0x1B702dd3…` (dee) | Kiln Discord | 10 | **PASSED** | PASS,PASS,PASS | [0x595c9568…](https://explorer-studio-dev.genlayer.com/tx/0x595c95688dc29675c047026bbc2f6bf379f2e188ec2cab798696e30f9fd899a8) | [0x287928ba…](https://explorer-studio-dev.genlayer.com/tx/0x287928ba2ce8ef0bd3425d96a1338e41fce5cb84064fb5161d218637a205fc83) |
| `0xE79DFdE4…` (bo) | Kiln Discord | 11 | **RETRY** | FAIL,FAIL,FAIL | [0x35ad94e8…](https://explorer-studio-dev.genlayer.com/tx/0x35ad94e8310d6f2d084b15730ecbbb1698e939d64e98b08294273fefe4040606) | [0x57980318…](https://explorer-studio-dev.genlayer.com/tx/0x579803188415b8f77c27a61f08179abb8cdc2d39887a8d1f3c87393bce12753f) |
| `0x0BB146F0…` (cy) | Kiln Discord | 12 | **EXPIRED** | no labels | [0x01c7c5d0…](https://explorer-studio-dev.genlayer.com/tx/0x01c7c5d013bfa49bd29cd8884007f0ef0524b2549b9675c409c1918db12b4f58) | [0x78d5ca6b…](https://explorer-studio-dev.genlayer.com/tx/0x78d5ca6b8079d251dedcb4bf3400bd8aa92be4f11860e49231d3227a68ed8e36) |
| `0x6486709E…` (ed1) | Quill Telegram | 8 | **RETRY** | FAIL,FAIL,FAIL | [0x02d7afc9…](https://explorer-studio-dev.genlayer.com/tx/0x02d7afc90e4841cf8bb10a0a2386edb070ba4d0bc79e910abf7e5b2e1922309b) | [0x771f983e…](https://explorer-studio-dev.genlayer.com/tx/0x771f983ed927efc7b92cdc2242fa91884358b337f057ef0c38e645aa42d41d9a) |

## Money

- ada:withdraw: [0xe8010b8f…](https://explorer-studio-dev.genlayer.com/tx/0xe8010b8f33995564ce3cbec1beb3e5a465b8c1cf96b65968673bf97d0f7e831c) (the fee that came back on a pass)
- dee:withdraw: [0x69ae7ddb…](https://explorer-studio-dev.genlayer.com/tx/0x69ae7ddbf568eceeb83d6657e0ba4927601709794c3e678807ce1066faa5c9ed) (the fee that came back on a pass)
- owner:withdraw: [0x41e905b5…](https://explorer-studio-dev.genlayer.com/tx/0x41e905b51b66940d602ee01954ac3175588f62c229f6b4ac1dbf1c5e5cc8389c) (the pool: fees of the failed and expired attempts)

## Every step

- `kiln:open_gate` open_gate ok [0x04bd0c88…](https://explorer-studio-dev.genlayer.com/tx/0x04bd0c8853787c354ef369a1717d790cce9450b8f7257950a008f1f012365279) 2026-11-08T17:55:35Z
- `ada:apply` apply ok [0x80c61785…](https://explorer-studio-dev.genlayer.com/tx/0x80c61785dec18340f18a7037ddb1946c4c80f58e6367def2b80cd5d3a7b075a5) 2026-11-08T17:55:48Z
- `ada:submit` submit ok [0x663f140f…](https://explorer-studio-dev.genlayer.com/tx/0x663f140f40676df4f78171d42dc5f7a3444c7e9889475b7b0faf8f2bb226120d) 2026-11-08T17:55:58Z
- `ada:judge` judge ok [0x3e786868…](https://explorer-studio-dev.genlayer.com/tx/0x3e7868685199298f4477d8f6605538a107a956f8b55ba4588664130bcd888a49) 2026-11-08T17:56:12Z
- `dee:apply` apply ok [0x595c9568…](https://explorer-studio-dev.genlayer.com/tx/0x595c95688dc29675c047026bbc2f6bf379f2e188ec2cab798696e30f9fd899a8) 2026-11-08T17:56:21Z
- `dee:submit` submit ok [0x6e03dd03…](https://explorer-studio-dev.genlayer.com/tx/0x6e03dd0321c77634d813e699ff2d4a99da0d893c4e3e066e1fe119666f8510b8) 2026-11-08T17:56:31Z
- `dee:judge` judge ok [0x287928ba…](https://explorer-studio-dev.genlayer.com/tx/0x287928ba2ce8ef0bd3425d96a1338e41fce5cb84064fb5161d218637a205fc83) 2026-11-08T17:56:51Z
- `bo:apply` apply ok [0x35ad94e8…](https://explorer-studio-dev.genlayer.com/tx/0x35ad94e8310d6f2d084b15730ecbbb1698e939d64e98b08294273fefe4040606) 2026-11-08T17:57:00Z
- `bo:submit` submit ok [0xd1606051…](https://explorer-studio-dev.genlayer.com/tx/0xd1606051d61c03da8f0dfc8c5be9c80a5d5aa31ca01c113c14ef4d0958be20d1) 2026-11-08T17:57:09Z
- `bo:judge` judge ok [0x57980318…](https://explorer-studio-dev.genlayer.com/tx/0x579803188415b8f77c27a61f08179abb8cdc2d39887a8d1f3c87393bce12753f) 2026-11-08T17:57:29Z
- `cy:apply` apply ok [0x01c7c5d0…](https://explorer-studio-dev.genlayer.com/tx/0x01c7c5d013bfa49bd29cd8884007f0ef0524b2549b9675c409c1918db12b4f58) 2026-11-08T17:57:39Z
- `cy:expire` expire ok [0x78d5ca6b…](https://explorer-studio-dev.genlayer.com/tx/0x78d5ca6b8079d251dedcb4bf3400bd8aa92be4f11860e49231d3227a68ed8e36) 2026-11-08T18:09:21Z
- `ada:withdraw` withdraw ok [0xe8010b8f…](https://explorer-studio-dev.genlayer.com/tx/0xe8010b8f33995564ce3cbec1beb3e5a465b8c1cf96b65968673bf97d0f7e831c) 2026-11-08T18:09:31Z
- `dee:withdraw` withdraw ok [0x69ae7ddb…](https://explorer-studio-dev.genlayer.com/tx/0x69ae7ddbf568eceeb83d6657e0ba4927601709794c3e678807ce1066faa5c9ed) 2026-11-08T18:09:42Z
- `owner:withdraw` withdraw ok [0x41e905b5…](https://explorer-studio-dev.genlayer.com/tx/0x41e905b51b66940d602ee01954ac3175588f62c229f6b4ac1dbf1c5e5cc8389c) 2026-11-08T18:09:51Z
- `quill:open_gate` open_gate ok [0x3fdd26e1…](https://explorer-studio-dev.genlayer.com/tx/0x3fdd26e14abddd3ebc7edc074e2a27b2bc65746a89dba60af39b3bb841026321) 2026-11-08T17:55:04Z
- `ed1:apply` apply ok [0x02d7afc9…](https://explorer-studio-dev.genlayer.com/tx/0x02d7afc90e4841cf8bb10a0a2386edb070ba4d0bc79e910abf7e5b2e1922309b) 2026-11-08T17:55:18Z
- `ed1:submit` submit ok [0x9b2cf44f…](https://explorer-studio-dev.genlayer.com/tx/0x9b2cf44f80bcb36e336e0b58c4d1a4a97789e1d73252301559a25b2cc01e47ef) 2026-11-08T17:55:27Z
- `ed1:judge` judge ok [0x771f983e…](https://explorer-studio-dev.genlayer.com/tx/0x771f983ed927efc7b92cdc2242fa91884358b337f057ef0c38e645aa42d41d9a) 2026-11-08T17:55:46Z
