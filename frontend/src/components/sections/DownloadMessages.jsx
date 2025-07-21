import { forwardRef } from 'react';

const DownloadMessages = forwardRef(({ downloadError, downloadSuccess }, ref) => {
  if (!downloadError && !downloadSuccess) {
    return null;
  }

  return (
    <div ref={ref}>
      {downloadError && (
        <div className="download-message error">
          <p>{downloadError}</p>
        </div>
      )}
      {downloadSuccess && (
        <div className="download-message success">
          <p>{downloadSuccess}</p>
        </div>
      )}
    </div>
  );
});

DownloadMessages.displayName = 'DownloadMessages';

export default DownloadMessages; 