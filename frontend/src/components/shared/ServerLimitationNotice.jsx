import './ServerLimitationNotice.css';

function ServerLimitationNotice({ 
  message = "Your license will only work with the servers you specified when you registered. If you need to add additional servers, you can purchase server permissions after activating your license."
}) {
  return (
    <div className="server-limitation-notice">
      <p className="notice-text">
        <strong>Server Limitation:</strong> {message}
      </p>
    </div>
  );
}

export default ServerLimitationNotice; 