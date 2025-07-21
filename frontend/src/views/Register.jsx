/**
 * Register view page
 * This page provides the registration interface for new users
 * It follows the same structure as other views in the project
 */

import { RegisterForm } from "../components";
import "../App.css";
import { NavLink } from "react-router-dom";

function Register() {
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
        <section className="register-page">
          <RegisterForm />
        </section>
      </div>
    </>
  );
}

export default Register;
