/**
 * Login view page
 * This page provides the login interface for existing users
 * It follows the same structure as other views in the project
 */

import { LoginForm } from "../components";
import "../App.css";
import { NavLink } from "react-router-dom";

function Login() {
  return (
    <>
      <header className="header nav-bar">
        <div className="logo">
          <NavLink to="/" style={{ textDecoration: "none" }}>
            <img src="Brand-Logo.png" alt="JCS Photo Suite" className="logo-img" />
          </NavLink>
        </div>
      </header>
      <div className="container">
        <section className="login-page">
          <LoginForm />
        </section>
      </div>
    </>
  );
}

export default Login;
