# Lottery

## Description

A lottery for KLAY tokens built with Orakl's VRF.

## [Scripts](package.json)

| Script             | Description                                                  |
|--------------------|--------------------------------------------------------------|
| `test`             | Run tests                                                    |
| `compile`          | Compile contracts                                            |
| `deploy:<network>` | Deploy contracts on ( mainnet \| testnet )                   |
| `sync`             | Sync contracts w/ other submodules (Auto-run after `deploy`) |

## [Roles](contracts/RoleControl/enum.sol)

| Role                                   | Permissions                                                                                                     |
|----------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| Root Owner<br/>(deployer of contracts) | All OwnerMember + [only RootOwner](#permissions-onlyRootOwner)                                                  |
| OwnerMember                            | Add/Remove Roles + Change contracts & internal properties (except [only RootOwner](#permissions-onlyRootOwner)) |
| Operator                               | Start, Stop, & Draw lottery                                                                                     |
| Injector                               | Inject KLAY into a running lottery                                                                              |

<h3 id="permissions-onlyRootOwner">only Root Owner</h3>

- Add/Remove OwnerMember
- Change [RoleControl][RoleControl], [ContractControl][ContractControl], & Prepayment

## Contracts

| Contract                                           | Description                                                        |
|----------------------------------------------------|--------------------------------------------------------------------|
| [RoleControl][RoleControl]                         | Manages roles & permissions for all contracts                      |
| [ContractControl][ContractControl]                 | Manages contract addresses & internal properties for all contracts |
| [SSLottery](contracts/SSLottery/index.sol)         | The lottery itself                                                 |
| [VRFConsumer](contracts/VRFConsumer.sol)           | Random number generation                                           |
| [DataFeedConsumer](contracts/DataFeedConsumer.sol) | KLAY->USD & vice-versa                                             |

[RoleControl]: contracts/RoleControl/index.sol
[ContractControl]: contracts/ContractControl/index.sol
