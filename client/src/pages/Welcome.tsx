import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <div className="welcome">
      <div className="welcome-inner">
        <h1 className="glow-title">Mish Senior</h1>
        <p className="tagline">Where IT talent meets opportunity</p>
        <p className="lead">
          Pick your specialization, ace a skills assessment and a voice interview, then let tech companies discover you, all in one place.
        </p>
        <div className="pills">
          <span className="pill">Skill Assessments</span>
          <span className="pill">AI-Evaluated Voice Interview</span>
          <span className="pill">Company Discovery</span>
        </div>
        <div className="cta-row">
          <Link to="/signup/student" className="cta fill">
            <strong>I'm a Graduate</strong>
            <small>Find assessments · Get interviewed · Get hired</small>
          </Link>
          <Link to="/signup/company" className="cta outline">
            <strong>I'm a Company</strong>
            <small>Browse candidates · View scores · Hire smarter</small>
          </Link>
        </div>
        <p className="fine" style={{ marginTop: 28 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
