import Head from '../assets/body_parts/head.svg';
import LeftShoulder from '../assets/body_parts/left-shoulder.svg';
import RightShoulder from '../assets/body_parts/right-shoulder.svg';
import LeftArm from '../assets/body_parts/left-arm.svg';
import RightArm from '../assets/body_parts/right-arm.svg';
import Chest from '../assets/body_parts/chest.svg';
import Stomach from '../assets/body_parts/stomach.svg';
import LeftLeg from '../assets/body_parts/left-leg.svg';
import RightLeg from '../assets/body_parts/right-leg.svg';
import LeftHand from '../assets/body_parts/left-hand.svg';
import RightHand from '../assets/body_parts/right-hand.svg';
import LeftFoot from '../assets/body_parts/left-foot.svg';
import RightFoot from '../assets/body_parts/right-foot.svg';
import OdasLogo from '../assets/ODAS_logo_ikona_barevne.png';
import './HumanBody.css';

// Define the mapping between body parts and signal types
const BODY_PART_TO_SIGNAL = {
  head: "brain",
  chest: "heart",
  stomach: "temperature",
  leftArm: "blood_pressure",
  rightArm: "blood_pressure"
  // Removed legs since they'll be static background elements
};

type BodyPartKey = keyof typeof BODY_PART_TO_SIGNAL;

interface HumanBodyProps {
  activeSignals: string[];
  onToggleSignal: (signalType: string) => void;
}

const HumanBody: React.FC<HumanBodyProps> = ({ activeSignals, onToggleSignal }) => {
  const handleBodyPartClick = (bodyPart: BodyPartKey) => {
    const signalType = BODY_PART_TO_SIGNAL[bodyPart];
    if (signalType) {
      onToggleSignal(signalType);
    }
  };
  
  // Check if a body part is active based on its corresponding signal
  const isBodyPartActive = (bodyPart: BodyPartKey): boolean => {
    const signalType = BODY_PART_TO_SIGNAL[bodyPart];
    return signalType ? activeSignals.includes(signalType) : false;
  };

  return (
    <div className="human-body">
      <div className="simulator-title">
        <div className="title-header">
          <img src={OdasLogo} alt="ODAS Logo" className="odas-logo" />
          <div className="title-content">
            <div className="title-main">
              <span className="title-text">PhysioSim</span>
            </div>
            <span className="title-subtitle">Bio-Signal Simulator</span>
          </div>
        </div>
      </div>
      
      <div 
        onClick={() => handleBodyPartClick('head')}
        className={`body-part brain-part ${isBodyPartActive('head') ? 'active' : ''}`}
        style={{ position: 'absolute', left: '50%', marginLeft: '-28.5px', top: '-6px' }}
        title="Brain Activity Monitor"
      >
        <img src={Head} alt="Head" className="svg-part" />
      </div>
      
      <div 
        onClick={() => handleBodyPartClick('leftArm')}
        className={`body-part blood-pressure-part ${isBodyPartActive('leftArm') ? 'active' : ''}`}
        style={{ position: 'absolute', left: '50%', marginLeft: '-78px', top: '112px' }}
        title="Blood Pressure Monitor"
      >
        <img src={LeftArm} alt="Left Arm" className="svg-part" />
      </div>
      
      <div 
        onClick={() => handleBodyPartClick('rightArm')}
        className={`body-part blood-pressure-part ${isBodyPartActive('rightArm') ? 'active' : ''}`}
        style={{ position: 'absolute', left: '50%', marginLeft: '38px', top: '112px', zIndex: 10001 }}
        title="Blood Pressure Monitor"
      >
        <img src={RightArm} alt="Right Arm" className="svg-part" />
      </div>
      
      <div 
        onClick={() => handleBodyPartClick('chest')}
        className={`body-part heart-part ${isBodyPartActive('chest') ? 'active' : ''}`}
        style={{ position: 'absolute', left: '50%', marginLeft: '-43.5px', top: '88px', zIndex: 10002 }}
        title="Electrocardiogram (EKG) Monitor"
      >
        <img src={Chest} alt="Chest" className="svg-part" />
      </div>
      
      <div 
        onClick={() => handleBodyPartClick('stomach')}
        className={`body-part temperature-part ${isBodyPartActive('stomach') ? 'active' : ''}`}
        style={{ position: 'absolute', left: '50%', marginLeft: '-37.5px', top: '130px' }}
        title="Body Temperature Monitor"
      >
        <img src={Stomach} alt="Stomach" className="svg-part" />
      </div>
      
      {/* Static legs - now background elements like feet and hands */}
      <div style={{ position: 'absolute', left: '50%', marginLeft: '-34.5px', top: '205px', zIndex: 9999 }}>
        <img src={LeftLeg} alt="Left Leg" className="svg-part static-part" />
      </div>
      
      <div style={{ position: 'absolute', left: '50%', marginLeft: '12.5px', top: '205px', zIndex: 9999 }}>
        <img src={RightLeg} alt="Right Leg" className="svg-part static-part" />
      </div>
      
      {/* Static parts for visual completeness */}
      <div style={{ position: 'absolute', left: '50%', marginLeft: '-43.5px', top: '74px' }}>
        <img src={LeftShoulder} alt="Left Shoulder" className="svg-part static-part" />
      </div>
      
      <div style={{ position: 'absolute', left: '50%', marginLeft: '23.5px', top: '74px' }}>
        <img src={RightShoulder} alt="Right Shoulder" className="svg-part static-part" />
      </div>
      
      <div style={{ position: 'absolute', left: '50%', marginLeft: '-90.5px', top: '230px' }}>
        <img src={LeftHand} alt="Left Hand" className="svg-part static-part" />
      </div>
      
      <div style={{ position: 'absolute', left: '50%', marginLeft: '78.5px', top: '224px', zIndex: 10000 }}>
        <img src={RightHand} alt="Right Hand" className="svg-part static-part" />
      </div>
      
      <div style={{ position: 'absolute', left: '50%', marginLeft: '-23.5px', top: '455px' }}>
        <img src={LeftFoot} alt="Left Foot" className="svg-part static-part" />
      </div>
      
      <div style={{ position: 'absolute', left: '50%', marginLeft: '17.5px', top: '455px' }}>
        <img src={RightFoot} alt="Right Foot" className="svg-part static-part" />
      </div>
    </div>
  );
};

export default HumanBody; 