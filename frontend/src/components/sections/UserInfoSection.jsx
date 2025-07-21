import { useEmailVerification } from '../shared/useEmailVerification';

function UserInfoSection({ user }) {
  const { isEmailVerified } = useEmailVerification();

  if (!user) {
    return null;
  }

  return (
    <div className="user-info">
      <h2>Welcome, {user.first_name} {user.last_name}!</h2>
      <div className="user-details">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>District:</strong> {user.district_name}</p>
        {user.district_uid && (
          <p><strong>District ID:</strong> {user.district_uid}</p>
        )}
        <p>
          <strong>Email Status:</strong>
          <span className={`status ${isEmailVerified ? 'verified' : 'unverified'}`}>
            {isEmailVerified ? ' Verified ✓' : ' Not Verified ⚠️'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default UserInfoSection; 