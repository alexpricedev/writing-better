const navLinks: { href: string; label: string; name: string }[] = [];

interface NavProps {
  page: string;
}

export const Nav = ({ page }: NavProps) => (
  <nav data-component="nav" aria-label="Main navigation">
    {/* Rendered hidden and unhidden by src/client/components/nav-menu.ts. Without
        that script — an error page ships none — the button would toggle nothing,
        so the nav keeps wrapping onto two rows instead. */}
    <button
      type="button"
      className="nav-toggle"
      aria-expanded="false"
      aria-controls="nav-menu"
      hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M10 3H8" />
        <path d="m15.007 5.008 3.987 3.986" />
        <path d="M20 15v4" />
        <path d="M21.174 6.813a2.82 2.82 0 0 0-3.986-3.987L3.842 16.175a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        <path d="M22 17h-4" />
        <path d="M4 5v4" />
        <path d="M6 7H2" />
        <path d="M9 2v2" />
      </svg>
      <span className="sr-only">Menu</span>
    </button>
    {/* Wrapper only so the toggle has a single thing to reveal. It is
        display: contents until the toggle takes over, which leaves the list as
        a direct flex child of the nav on desktop. */}
    <div id="nav-menu" className="nav-panel">
      <ul>
        {navLinks.map(({ href, label, name }) => (
          <li key={name}>
            <a
              href={href}
              className={page === name ? "active" : undefined}
              aria-current={page === name ? "page" : undefined}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </nav>
);
