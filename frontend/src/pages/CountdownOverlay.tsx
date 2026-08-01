    import img1 from '../assets/1.png';
    import img2 from '../assets/2.png';
    import img3 from '../assets/3.png';

    interface CountdownOverlayProps {
    countdown: number | null;
    }

    export default function CountdownOverlay({ countdown }: CountdownOverlayProps) {
    if (countdown === null) return null;

    return (
        <div className="countdown-overlay">
        {countdown === 3 && <img src={img3} alt="3" className="countdown-img" />}
        {countdown === 2 && <img src={img2} alt="2" className="countdown-img" />}
        {countdown === 1 && <img src={img1} alt="1" className="countdown-img" />}
        {countdown === 0 && <div className="start-text">START!</div>}
        </div>
    );
    }