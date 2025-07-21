import './BackNavigation.css';

function BackNavigation({ onBack, backText, currentPage }) {
  return (
    <nav className="back-navigation">
      <button onClick={onBack} className="back-nav-button">
        <span className="arrow">←</span>
        {backText}
      </button>
      <span className="breadcrumb-separator">/</span>
      <span className="current-page">{currentPage}</span>
    </nav>
  );
}

export default BackNavigation; 