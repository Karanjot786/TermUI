const app = document.getElementById('app')!;

app.innerHTML = `
  <header style="background:#0a0a0a;border-bottom:1px solid #1f1f1f;padding:1rem 2rem;display:flex;align-items:center;gap:1rem">
    <span style="font-size:1.25rem;font-weight:700;color:#e5e5e5">TermUI</span>
    <nav style="margin-left:auto;display:flex;gap:1.5rem">
      <a href="/docs" style="color:#a3a3a3;text-decoration:none">Docs</a>
      <a href="/packages" style="color:#a3a3a3;text-decoration:none">Packages</a>
      <a href="https://github.com/Karanjot786/TermUI" style="color:#a3a3a3;text-decoration:none">GitHub</a>
    </nav>
  </header>
  <main style="max-width:800px;margin:4rem auto;padding:0 2rem">
    <h1 style="font-size:3rem;font-weight:700;color:#e5e5e5;margin-bottom:1rem">TermUI</h1>
    <p style="font-size:1.25rem;color:#a3a3a3;margin-bottom:2rem">
      A modern terminal UI framework for building rich CLI applications with React-like components.
    </p>
    <div style="display:flex;gap:1rem">
      <a href="/docs/getting-started" style="background:#e5e5e5;color:#0a0a0a;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600">Get Started</a>
      <a href="https://github.com/Karanjot786/TermUI" style="border:1px solid #404040;color:#e5e5e5;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none">View on GitHub</a>
    </div>
  </main>
`;
