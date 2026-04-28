import hre from "hardhat";

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No deployer account found! Please make sure your .env file is saved, contains exactly a 64-character private key, and was not accidentally modified incorrectly.");
  }
  const deployer = signers[0];
  console.log("Deploying contract with the account:", deployer.address);

  // Deploy MedicalRecords
  const MedicalRecords = await hre.ethers.getContractFactory("MedicalRecords");
  const contract = await MedicalRecords.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("MedicalRecords deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
