import './StatusCard.css';

function StatusCard({ 
  icon, 
  title, 
  message, 
  variant = 'info', 
  children, 
  className = '' 
}) {
  const cardClasses = `status-card ${variant} ${className}`.trim();

  return (
    <div className={cardClasses}>
      {icon && <div className="status-icon">{icon}</div>}
      {title && <h2>{title}</h2>}
      {message && <p>{message}</p>}
      {children && (
        <div className="status-actions">
          {children}
        </div>
      )}
    </div>
  );
}

export default StatusCard; 