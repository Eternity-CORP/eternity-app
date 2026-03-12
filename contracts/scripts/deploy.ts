import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Add new contract deployments here
  console.log("No contracts to deploy.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
