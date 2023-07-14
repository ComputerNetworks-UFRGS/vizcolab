import {
    faCircleNodes,
    faShare,
    faTrophy,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';
import { ContentMode, GlobalContext } from '../App';
import HeaderSelectors from './HeaderSelectors/HeaderSelectors';

Modal.setAppElement('#root'); // This line is required for accessibility reasons

const Header = ({ onShare, setContentMode }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [headerSelectorsCleared, setHeaderSelectorsCleared] = useState(false);
    const { setUniversity, setPrograms, setAuthor, setSharedState } =
        React.useContext(GlobalContext);
    const navigate = useNavigate();

    const handleShare = async () => {
        setIsLoading(true);
        const { id } = await onShare();
        const url = `${window.location.origin}/shared/${id}`;
        setShareUrl(url);
        setIsLoading(false);
    };

    const openModal = () => {
        setIsModalOpen(true);
        handleShare();
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setShareUrl(null);
    };

    const goToHome = () => {
        setUniversity(undefined);
        setPrograms([]);
        setAuthor(undefined);
        setSharedState(undefined);
        navigate('/');
    };

    return (
        <section className="header">
            <div className="right">
                <div className="logo">
                    <span onClick={goToHome}>
                        <FontAwesomeIcon icon={faCircleNodes} />
                        &nbsp;
                        <b>Viz</b>Colab&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    </span>
                    <span
                        className="mode-button"
                        onClick={() => {
                            setHeaderSelectorsCleared(false);
                            setContentMode(ContentMode._3D);
                        }}
                    >
                        3D
                    </span>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <span
                        className="mode-button"
                        onClick={() => {
                            setHeaderSelectorsCleared(false);
                            setContentMode(ContentMode._2D);
                        }}
                    >
                        2D
                    </span>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <FontAwesomeIcon
                        className="trophy"
                        icon={faTrophy}
                        onClick={() => {
                            setHeaderSelectorsCleared(true);
                            setContentMode(ContentMode.Rankings);
                        }}
                    />
                </div>
            </div>

            <div className="left">
                <button onClick={openModal} className="share-button">
                    <FontAwesomeIcon icon={faShare} />
                    <span className="tooltip">Compartilhar</span>
                </button>
                <HeaderSelectors cleared={headerSelectorsCleared} />
            </div>

            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                className="modal"
                overlayClassName="modalOverlay"
            >
                {isLoading ? (
                    <div>
                        <FontAwesomeIcon icon={faCircleNodes} spin />
                        <p>Sua URL está sendo gerada...</p>
                    </div>
                ) : (
                    <div>
                        <h2>URL para compartilhamento: </h2>
                        <p>{shareUrl}</p>
                    </div>
                )}
            </Modal>
        </section>
    );
};

export default Header;
