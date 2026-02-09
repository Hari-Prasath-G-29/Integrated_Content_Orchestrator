
// import React, { useState } from 'react';
// import 'bootstrap/dist/css/bootstrap.min.css';           // keep Bootstrap
// import IntelligenceHub from './components/IntelligenceHub';
// import ContentWorkshopCard from './components/ContentWorkshopCard';
// import TemplateSelection from './components/TemplateSelection';
// import './App.css';                                      // keep your CSS
// import DesignStudio from './components/DesignStudio';
// import PreMLRCompanion from './components/PreMLRCompanion';
// import GlocalizationFactory from './components/GlocalizationFactory';
// import FactoryOperations from './components/FactoryOperations';

// export default function Pre_App() {


//   return (
//     <div className="page-hero">
//       {/* Optional page title to match screenshot */}
//       <h1 className="page-title">Content Operations</h1>

//       {/* Your original row container stays intact */}
//       <div className="cards-row">
//         {/* Left card: Intelligence Hub (always visible) */}
//         <IntelligenceHub />
//         <ContentWorkshopCard />

//           </div>

//      <h2 className="page-title">Specialized tools</h2>      
// <div className="cards-row1">
//   <DesignStudio />
//   <PreMLRCompanion />
//   <GlocalizationFactory />
// </div>

//           <div className='cards-row'>
//             <FactoryOperations />
//         </div>        
//       </div>
    
//   );
// }



import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';           // keep Bootstrap
import IntelligenceHub from './components/IntelligenceHub';
import ContentWorkshopCard from './components/ContentWorkshopCard';
import TemplateSelection from './components/TemplateSelection';
// import './App.css';                                      
import DesignStudio from './components/DesignStudio';
import PreMLRCompanion from './components/PreMLRCompanion';
import GlocalizationFactory from './components/GlocalizationFactory';
import FactoryOperations from './components/FactoryOperations';
import SystemAdministration from './components/SystemAdministration';
import './components/css/Header.css';

import HomeIcon from '@mui/icons-material/Home';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';

export default function Pre_App() {
  

// --- Header dropdown UI state & behavior (kept inside this component) ---
const [userMenuOpen, setUserMenuOpen] = useState(false);
const headerRef = useRef(null);

// Toggle when clicking the user area
const toggleUserMenu = () => setUserMenuOpen((v) => !v);

// Close menu on outside click
useEffect(() => {
  function handleOutsideClick(e) {
    if (headerRef.current && !headerRef.current.contains(e.target)) {
      setUserMenuOpen(false);
    }
  }
  if (userMenuOpen) {
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
  }
  return () => {
    document.removeEventListener('mousedown', handleOutsideClick);
    document.removeEventListener('touchstart', handleOutsideClick);
  };
}, [userMenuOpen]);


  return (
    <div className="page-hero">

 {/* ===== Fixed, full-width header using MUI Icons ===== */}
 <div className="co-header co-header--fixed" ref={headerRef}>
        <div className="co-header-inner">
          {/* Left: Dashboard/Home icon */}
          <div className="co-left">
            <HomeIcon className="co-icon" fontSize="medium" />
          </div>

          {/* Center: Title */}
          <div className="co-title">Content Orchestrator</div>

          {/* Right: User + dropdown */}
          <div className="co-right">
            <button
              type="button"
              className="co-user"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              onClick={toggleUserMenu}
            >
              <AccountCircleIcon className="co-user-icon" fontSize="large" />
              <span className="co-username">User</span>
              {userMenuOpen ? (
                <ExpandLessIcon className="ms-1" />
              ) : (
                <ExpandMoreIcon className="ms-1" />
              )}
            </button>

            {userMenuOpen && (
              <div className="co-dropdown" role="menu" aria-label="User menu">
                <button className="co-dropdown-item" role="menuitem" type="button">
                  <PersonIcon /> Profile
                </button>
                <button className="co-dropdown-item text-danger" role="menuitem" type="button">
                  <LogoutIcon /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ===== /HEADER ===== */}



      <div className="container" style={{ maxWidth: '1400px' }}>
      {/* Optional page title to match screenshot */}
      <h1 className="page-title mb-3">Content Operations</h1>

      {/* Your original row container stays intact */}
      <div className="cards-row">
        {/* Left card: Intelligence Hub (always visible) */}
        <IntelligenceHub />
        <ContentWorkshopCard />

          </div>

     <h2 className="page-title mb-3 mt-3">Specialized tools</h2>      
<div className="cards-row1">
  <DesignStudio />
  <PreMLRCompanion />
  <GlocalizationFactory />
</div>

          <div className='cards-row'>
            <FactoryOperations />
        </div>     
        <div className='cards-row'>
            <SystemAdministration defaultOpen={false}/>
        </div>    
      </div>
      </div>
  );
}
