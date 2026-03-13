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
    const { setUniversity, setPrograms, setAuthor, setSharedState, author } =
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

    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard
            .writeText(shareUrl ?? '')
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 550);
            })
            .catch((err) => {
                console.error('Could not copy text: ', err);
            });
    };

    return (
        <section className="header">
            <div className="right">
                <div className="logo">
                    <span onClick={goToHome}>
                        {!author && <FontAwesomeIcon icon={faCircleNodes} />}
                        &nbsp;
                        <b>Viz</b>Colab&nbsp;&nbsp;&nbsp;
                        {!author && <>&nbsp;&nbsp;</>}
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
                    &nbsp;&nbsp;&nbsp;{!author && <>&nbsp;&nbsp;</>}
                    <span
                        className="mode-button"
                        onClick={() => {
                            setHeaderSelectorsCleared(false);
                            setContentMode(ContentMode._2D);
                        }}
                    >
                        2D
                    </span>
                    &nbsp;&nbsp;&nbsp;{!author && <>&nbsp;&nbsp;</>}
                    <FontAwesomeIcon
                        className="trophy"
                        icon={faTrophy}
                        onClick={() => {
                            setHeaderSelectorsCleared(false);
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
                        <h2
                            style={{
                                color: 'black',
                            }}
                        >
                            URL para compartilhamento:
                        </h2>
                        <div
                            style={{
                                position: 'relative',
                            }}
                        >
                            <input
                                value={shareUrl ?? ''}
                                style={{
                                    width: '93.5%',
                                    padding: '10px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                }}
                                readOnly
                            />
                            <div
                                onClick={copyToClipboard}
                                style={{
                                    position: 'absolute',
                                    right: '1px',
                                    top: '0',
                                    padding: '0.59rem 0.95rem',
                                    borderRadius: '0px 5px 5px 0px',
                                    backgroundColor: '#546de5',
                                    color: 'white',
                                    display: 'inline-block',
                                    cursor: 'pointer',
                                    float: 'right',
                                }}
                            >
                                {isCopied ? 'Copiado!' : 'Copiar'}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </section>
    );
};

export default Header;
