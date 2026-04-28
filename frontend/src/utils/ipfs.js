export const uploadToIPFS = async (file) => {
  try {
    console.log("Uploading file to real IPFS via Pinata...", file.name);

    if (!import.meta.env.VITE_PINATA_JWT) {
      throw new Error("Missing VITE_PINATA_JWT in .env");
    }

    const formData = new FormData();
    formData.append("file", file);

    const metadata = JSON.stringify({
      name: file.name,
    });
    formData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append("pinataOptions", options);

    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pinata upload failed: ${response.status} - ${errText}`);
    }

    const resData = await response.json();
    console.log("File explicitly pinned to IPFS! Hash:", resData.IpfsHash);
    return resData.IpfsHash;

  } catch (error) {
    console.error("IPFS Upload Error:", error);
    throw error;
  }
};
