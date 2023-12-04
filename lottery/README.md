# Lottery

## Description

A lottery for KLAY tokens built with Orakl's VRF.

## Scripts

| Script             | Description                                                  |
|--------------------|--------------------------------------------------------------|
| `test`             | Run tests                                                    |
| `compile`          | Compile contracts                                            |
| `deploy:<network>` | Deploy contracts on ( mainnet \| testnet )                   |
| `sync`             | Sync contracts w/ other submodules (Auto-run after `deploy`) |

## Roles

| Role                                   | Permissions                                                                                                     |
|----------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| Root Owner<br/>(deployer of contracts) | All OwnerMember + [only RootOwner](#permissions-onlyRootOwner)                                                  |
| OwnerMember                            | Add/Remove Roles + Change contracts & internal properties (except [only RootOwner](#permissions-onlyRootOwner)) |
| Operator                               | Start, Stop, & Draw lottery                                                                                     |
| Injector                               | Inject KLAY into a running lottery                                                                              |

<h3 id="permissions-onlyRootOwner">only Root Owner</h3>

- Add/Remove OwnerMember
- Change RoleControl, ContractControl, & Prepayment

## Contracts

| Contract         | Description                                                        |
|------------------|--------------------------------------------------------------------|
| RoleControl      | Manages roles & permissions for all contracts                      |
| ContractControl  | Manages contract addresses & internal properties for all contracts |
| SSLottery        | The lottery itself                                                 |
| VRFConsumer      | Random number generation                                           |
| DataFeedConsumer | KLAY->USD & vice-versa                                             |
