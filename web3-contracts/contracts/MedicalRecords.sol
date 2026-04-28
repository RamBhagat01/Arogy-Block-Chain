// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalRecords {
    // Record holds multiple IPFS hashes representing pdf/png data
    struct Record {
        string ipfsHash;
        uint256 timestamp;
        string documentType; // e.g., "PDF", "PNG"
    }

    // Patient address => Doctor address => hasAccess
    mapping(address => mapping(address => bool)) public accessRegistry;
    
    // Patient address => Array of their medical records
    mapping(address => Record[]) private patientRecords;

    event AccessRequested(address indexed doctor, address indexed patient);
    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);
    event RecordAdded(address indexed patient, string ipfsHash, string documentType, uint256 timestamp);

    // Doctor can trigger this to notify the patient they want access
    function requestAccess(address patient) public {
        emit AccessRequested(msg.sender, patient);
    }

    // Patient grants access to a specific doctor
    function grantAccess(address doctor) public {
        accessRegistry[msg.sender][doctor] = true;
        emit AccessGranted(msg.sender, doctor);
    }

    // Patient revokes access from a specific doctor
    function revokeAccess(address doctor) public {
        accessRegistry[msg.sender][doctor] = false;
        emit AccessRevoked(msg.sender, doctor);
    }

    // Doctor uploads a new medical record (PDF/PNG stored on IPFS) for a patient
    function addRecord(address patient, string memory _ipfsHash, string memory _documentType) public {
        patientRecords[patient].push(Record({
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            documentType: _documentType
        }));
        emit RecordAdded(patient, _ipfsHash, _documentType, block.timestamp);
    }

    // Fetch all records for a patient. Must be the patient or an approved doctor
    function getRecords(address patient) public view returns (Record[] memory) {
        require(
            patient == msg.sender || accessRegistry[patient][msg.sender],
            "Access denied: You do not have permission to view these records."
        );
        return patientRecords[patient];
    }
}
