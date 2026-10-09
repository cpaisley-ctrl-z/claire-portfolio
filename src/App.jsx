import './App.css'

const currentYear = new Date().getFullYear()

const projects = [
  {
    title: 'Project one',
    summary: 'A short description of the problem, your role, and the outcome.',
  },
  {
    title: 'Project two',
    summary: 'A short description of the problem, your role, and the outcome.',
  },
  {
    title: 'Project three',
    summary: 'A short description of the problem, your role, and the outcome.',
  },
]

function App() {
  return (
    <>
      <header className="site-header">
        <a className="logo" href="#top">
          Claire
        </a>
        <nav>
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <p className="eyebrow">UX Designer</p>
          <h1>Designing clear, human-centered experiences.</h1>
          <p className="lede">
            I'm Claire. This is where my case studies, process, and research
            will live.
          </p>
        </section>

        <section id="work" className="section">
          <h2>Selected work</h2>
          <ul className="project-grid">
            {projects.map((project) => (
              <li key={project.title} className="project-card">
                <div className="project-thumb" aria-hidden="true" />
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="about" className="section">
          <h2>About</h2>
          <p>A few sentences about your background and how you approach design.</p>
        </section>

        <section id="contact" className="section">
          <h2>Contact</h2>
          <p>
            <a href="mailto:hello@example.com">hello@example.com</a>
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <p>© {currentYear} Claire</p>
      </footer>
    </>
  )
}

export default App
