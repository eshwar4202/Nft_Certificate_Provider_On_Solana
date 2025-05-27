// client component (e.g., MintButton.tsx)
"use client";

export default function MintButton(ownerid: String) {
  const handleClick = async () => {
    const res = await fetch("/api/mint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ownerid }),
    });
    const json = await res.json();
    if (json.success) {
      alert("NFT minted!");
    } else {
      alert("Error: " + json.error);
    }
  };

  return <button onClick={handleClick} className="absolute z-50 left-200 top-100">Mint NFT</button>;
}

