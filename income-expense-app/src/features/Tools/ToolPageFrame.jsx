import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Consistent mobile chrome for every ported tool. The tool itself keeps the
 * desktop component and its existing business logic/API calls untouched.
 */
export default function ToolPageFrame({ title, subtitle, children, fullBleed = false }) {
  const navigate = useNavigate();

  return (
    <div className={`tool-page${fullBleed ? ' tool-page--full' : ''}`}>
      <div className="tool-page-head">
        <button
          type="button"
          className="tool-back-button"
          onClick={() => navigate('/app/tools')}
          aria-label="Back to Tools"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="tool-page-heading">
          <h1 className="tool-page-title">{title}</h1>
          {subtitle ? <p className="tool-page-subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <div className="tool-page-body">{children}</div>
    </div>
  );
}
