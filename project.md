Blockchain-Based Secure Document Storage and Verification System for Individuals in Nepal
Name: [Your Name]
Student ID: [Your ID]
Date: July 21, 2025
Module: ST6000CEM - Individual Project Preparation
Word Count: ~2000 words
 
Keywords
Blockchain, Document Storage, IPFS, Smart Contract, Ethereum, Personal Document Verification, Nepal, Cybersecurity, Decentralized Applications
Table of Contents
[Auto-generate in Word: References, Methodology, Risk Management, etc.]
 
1. Introduction
Nepal’s educational institutions continue to rely heavily on paper-based certificates, which are highly susceptible to forgery, loss, and damage. This project proposes a blockchain-powered secure document storage and verification system aimed at academic institutions in Nepal. By using blockchain’s immutable ledger and decentralized verification, institutions can issue tamper-proof academic credentials that are easily verifiable globally.
2. Aim
To design and implement a blockchain-based system to securely store, verify, and manage personal documents using smart contracts and decentralized file systems such as IPFS.
3. Objectives
• Investigate current inefficiencies in academic credential issuance in Nepal.
• Design a smart contract and decentralized file system for document storage.
• Develop a web-based user interface for uploading and verifying documents.
• Ensure the system follows legal and ethical standards for data security.
4. Statement of Problem
Nepali individuals lack a robust mechanism to verify or protect the integrity of their personal documents. This has led to increasing incidents of forgery and administrative delays. A blockchain-based system can mitigate these issues by providing immutable audit trails and secure access to certified documents.
5. Research Questions
1. How can blockchain be utilized to enhance personal document verification in Nepal?
2. What are the legal and ethical implications of decentralized academic storage?
3. How can blockchain systems maintain scalability and security in resource-constrained settings?
6. Literature Review

The literature on blockchain-based document management has evolved substantially in recent years. 
Sai Sandeep N and Magna Yadlapalli (2025) introduced the use of IPFS to store encrypted off-chain documents, reducing blockchain storage costs. Their hybrid storage model combines blockchain hashes and IPFS pointers to ensure document immutability. Oetomo (2021) elaborated on system design principles for a certified document sharing platform, introducing smart contract automation and consensus protocols to enhance document verification.

Raipurkar et al. (2024) examined how cryptographic hashing using SHA-256 secures document integrity, while Guo et al. (2022) highlighted Directed Acyclic Graph (DAG) structures that minimize file redundancy. For network consensus, Gautam & Ali (2025) and Benjamin et al. (2024) emphasized Proof of Authority (PoA) to reduce transaction latency in private Ethereum networks.

The role of smart contracts in lifecycle management is widely recognized. Kumawat & Naik (2024) explored ownership transfer using NFTs, and Das et al. (2020) discussed access control via role-based permissions. Salau & Adeshina (2021) extended this by implementing dynamic access logs for audit trails. End-to-end encryption using AES-256, as described by Gousteris et al. (2023), is a cornerstone of document privacy, while authentication layers such as GBSIV (Rubavathy et al., 2025) and Self-Sovereign Identity (Satybaldy et al., 2022) provide secure user identification.

To prevent tampering, Karale (2025) and Asode et al. (2023) proposed immutable audit trails, where each transaction is timestamped and logged. Raghuvanshi (2025) introduced QR-code-based verification, simplifying certificate validation. Rachmawati et al. (2023) showed how EduCTX improves academic resilience using Filecoin’s decentralized architecture.

Security challenges remain. Quantum threats (Sola-Thomas & Imtiaz, 2025) and IPFS vulnerabilities (Mondong et al., 2024) necessitate quantum-resistant encryption and content-addressable gateways. Benjamin et al. (2024) reported the tradeoffs in private blockchains’ speed versus decentralization, recommending Layer-2 solutions like Polygon (Unknown, 2024) to cut Ethereum gas fees by 92%.

Innovative key protection methods, such as DNA-encrypted keys (Yıldırım, 2023), are emerging. Legal and healthcare sectors have adopted blockchain for secure eVaults (Dinde & Shirgave, 2024), and HIPAA-compliant medical records (Brijwani et al., 2025). In construction, BIM compliance auditing uses similar principles (Das et al., 2020).

Future directions include Zero-Knowledge Proofs (Satybaldy et al., 2022), AI-integrated access analytics (Haque et al., 2024), and cross-chain document protocols (Karale, 2025; Alesia, 2025). Wu et al. (2023) noted AI-driven anomaly detection reduced breach response times to under 500ms. This demonstrates growing convergence between blockchain, AI, and cybersecurity for document protection.

7. Methodology
Agile SDLC will be followed. Components include:
- Smart contract development (Ethereum testnet, Solidity)
- IPFS for document storage
- Frontend in React and backend in Node.js
- MetaMask for identity/authentication
8. Tools and Technologies
• Ethereum (Rinkeby/Testnet)
• Solidity
• IPFS
• React.js / Node.js
• MetaMask
• MongoDB (optional metadata storage)
9. Risk Management

The project faces multiple technical and non-technical risks:

• High gas fees on Ethereum mainnet: These are mitigated by using Ethereum testnets (like Rinkeby) or Layer-2 solutions like Polygon, which have shown to reduce fees by up to 92% (Unknown, 2024).

• Data privacy compliance: Blockchain is immutable, so storing personal data directly can be a privacy risk. To avoid this, only the cryptographic hash of the document will be stored on-chain, while the actual files reside on IPFS.

• IPFS vulnerability: Public gateways like Pinata may expose off-chain documents. The solution is to encrypt files before IPFS upload using AES-256 and ensure access is only allowed via smart contract validation.

• User adoption: Blockchain-based systems often suffer from poor usability. To address this, the interface will be simplified, and wallet integration will be guided via tutorials.

• Smart contract bugs: Audits and test cases will be used to prevent vulnerabilities in Solidity code, with fallback logic and version control built into the deployment process.

10. Conclusion

This proposal outlines a blockchain-based secure document storage and verification system aimed at Nepali academic institutions. The project uses Ethereum smart contracts and IPFS for decentralized, tamper-proof storage. Literature analysis confirms the viability of this model, referencing real-world systems such as EduCTX and Blockcerts. The solution addresses forgery, administrative burden, and verification bottlenecks by offering immutable audit trails and smart contract-managed access control.

Security risks such as quantum threats, storage vulnerabilities, and regulatory concerns are acknowledged and mitigated via encryption, off-chain storage, and privacy-aware design. The system has significant future scalability, as AI integration and cross-chain compatibility can extend its usefulness beyond education to healthcare, legal, and government sectors in Nepal.

Ultimately, this project not only improves document trustworthiness but aligns with Nepal’s growing emphasis on digital governance and public infrastructure modernization.

11. References
[In-text citations from the user-provided list will be included in APA 7th format.]
Appendix
• SWOT Analysis
• PESTLE Analysis
• Gantt Chart
• System Flowchart

[To be added upon final implementation]
