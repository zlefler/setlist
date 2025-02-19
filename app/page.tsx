'use client';
import { useState } from 'react';

export default function Home() {
  const [setlists, setSetlists] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bandName, setBandName] = useState('');

  function getBand() {
    fetch(`/api/setlists/${encodeURIComponent(bandName)}`, {})
      .then((res) => res.json())
      .then((data) => {
        setSetlists(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching setlists:', err);
        setLoading(false);
      });
  }

  return (
    <div>
      <input onChange={(e) => setBandName(e.target.value)}></input>
      <button onClick={getBand}>Submit</button>
      <h1>Setlist Data</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <pre>{JSON.stringify(setlists, null, 2)}</pre>
      )}
    </div>
  );
}
