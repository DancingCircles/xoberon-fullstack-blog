import { useState, useCallback } from 'react'
import { useAuth } from '../../../hooks/auth/useAuth'
import './Footer.css'
import contactArrow from '../../../assets/images/Icons/decorations/contact-arrow.svg'
import buttonStar1 from '../../../assets/images/Icons/buttons/button-star-1.svg'
import buttonStar2 from '../../../assets/images/Icons/buttons/button-star-2.svg'
import buttonTop from '../../../assets/images/Icons/buttons/button-top.svg'
import buttonBottom from '../../../assets/images/Icons/buttons/button-bottom.svg'
import ContactModal from '../../Contact/ContactModal'

export default function Footer() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { requireAuth } = useAuth()

  const handleOpenModal = useCallback(() => {
    if (!requireAuth()) return
    setIsModalOpen(true)
  }, [requireAuth])

  return (
    <footer className="footer-section">
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <div className="footer-content">
        <div className="reach-out-container">
          <div className="reach-out-text">
            <h2 className="reach-out-title">
              <span className="reach-out-line">REACH <span className="reach-out-accent">OUT</span></span>
            </h2>
          </div>
          
          <div className="cta-container">
            <img src={contactArrow} alt="" className="contact-arrow" />
            
            <button 
              className="cta-button" 
              aria-label="Contact Us"
              onClick={handleOpenModal}
            >
              <div className="cta-button-wrapper">
                <img src={buttonStar1} alt="" className="star star-1" />
                <img src={buttonStar2} alt="" className="star star-2" />
                
                <img src={buttonBottom} alt="" className="button-base" />
                <div className="button-top-container">
                  <img src={buttonTop} alt="" className="button-top" />
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-credit">
            DESIGNED & BUILT BY XOBERON
          </div>
        </div>
      </div>
    </footer>
  )
}
