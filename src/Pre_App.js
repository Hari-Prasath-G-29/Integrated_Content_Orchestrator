
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


import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import IntelligenceHub from './components/IntelligenceHub';
import ContentWorkshopCard from './components/ContentWorkshopCard';
import DesignStudio from './components/DesignStudio';
import PreMLRCompanion from './components/PreMLRCompanion';
import GlocalizationFactory from './components/GlocalizationFactory';
import FactoryOperations from './components/FactoryOperations';
import './App.css';
 
export default function Pre_App() {
  return (
    <div className="page-hero">
      <h1 className="page-title">Content Operations</h1>
 
      <div className="cards-row">
        <IntelligenceHub />
        <ContentWorkshopCard />
      </div>
 
      <h2 className="page-title">Specialized tools</h2>      
      <div className="cards-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <DesignStudio />
        <PreMLRCompanion />
        <GlocalizationFactory />
      </div>
 
      <div className='cards-row'>
         <div style={{ gridColumn: "span 2" }}>
            <FactoryOperations />
         </div>
      </div>        
    </div>
  );
}