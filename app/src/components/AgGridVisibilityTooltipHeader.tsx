import { faEye } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    Checkbox,
    ClickAwayListener,
    FormControlLabel,
    FormGroup,
    Tooltip,
} from '@mui/material';
import { IHeaderParams } from 'ag-grid-community';
import { useEffect, useState } from 'react';

export interface ICustomHeaderParams extends IHeaderParams {
    menuIcon: string;
}

const VisibilityTooltipHeader = (props: ICustomHeaderParams) => {
    const [open, setOpen] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState<
        Map<string, boolean>
    >(new Map());

    useEffect(() => {
        const newColumnVisibility = new Map<string, boolean>();
        props.columnApi.getColumns()!.forEach((column) => {
            newColumnVisibility.set(column.getColId(), column.isVisible());
        });
        setColumnVisibility(newColumnVisibility);
    }, [props.columnApi]);

    const handleTooltipClose = () => {
        setOpen(false);
    };

    const handleIconClick = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const handleCheckboxChange =
        (columnId: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
            const newColumnVisibility = new Map(columnVisibility);
            newColumnVisibility.set(columnId, event.target.checked);
            setColumnVisibility(newColumnVisibility);
            props.columnApi.setColumnVisible(columnId, event.target.checked);
        };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="customHeaderLabel">{props.displayName}</div>
            <div className="customHeaderMenuButton">
                <ClickAwayListener onClickAway={handleTooltipClose}>
                    <div>
                        <Tooltip
                            onClose={handleTooltipClose}
                            open={open}
                            disableFocusListener
                            disableHoverListener
                            disableTouchListener
                            arrow
                            title={
                                <FormGroup className="toggle-columns-tooltip">
                                    {Array.from(columnVisibility).map(
                                        ([columnId, visible], i) => {
                                            const column =
                                                props.columnApi.getColumn(
                                                    columnId,
                                                )!;
                                            if (i === 0) {
                                                return null;
                                            }
                                            return (
                                                <FormControlLabel
                                                    key={columnId}
                                                    control={
                                                        <Checkbox
                                                            checked={visible}
                                                            onChange={handleCheckboxChange(
                                                                columnId,
                                                            )}
                                                        />
                                                    }
                                                    label={
                                                        column.getColDef()
                                                            .headerName
                                                    }
                                                />
                                            );
                                        },
                                    )}
                                </FormGroup>
                            }
                        >
                            <FontAwesomeIcon
                                icon={faEye}
                                onClick={handleIconClick}
                            />
                        </Tooltip>
                    </div>
                </ClickAwayListener>
            </div>
        </div>
    );
};

export default VisibilityTooltipHeader;
