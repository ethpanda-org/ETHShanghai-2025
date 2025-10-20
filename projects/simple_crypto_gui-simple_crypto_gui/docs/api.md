# API 接口文档 / API Interface Documentation

## 去中心化架构说明 / Decentralized Architecture Description

本项目采用完全去中心化的架构，没有中心化服务器，无需API调用。
This project adopts a completely decentralized architecture with no centralized servers and no API calls required.

## 与区块链的直接交互 / Direct Interaction with Blockchain

由于项目的去中心化特性，所有操作都是通过前端应用直接与区块链节点进行交互，不经过任何中心化的中间层或API服务。
Due to the decentralized nature of the project, all operations are performed through direct interaction between the frontend application and blockchain nodes, without going through any centralized middle layers or API services.

## 注意事项 / Notes

- 交易签名和验证在用户本地设备完成 / Transaction signing and verification are completed on the user's local device
- 应用在本地运行时通过Web3库直接与区块链通信 / The application communicates directly with the blockchain through Web3 libraries when running locally