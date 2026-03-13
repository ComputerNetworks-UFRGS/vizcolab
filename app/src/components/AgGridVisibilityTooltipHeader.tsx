import { faCog } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    Checkbox,
    CheckboxProps,
    ClickAwayListener,
    FormControlLabel,
    FormGroup,
    Tooltip,
    styled,
} from '@mui/material';
import { IHeaderParams } from 'ag-grid-community';
import { debounce } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import YearRangeSlider from './YearRangeSlider';

export interface ICustomHeaderParams extends IHeaderParams {
    menuIcon: string;
    yearRange: [number, number];
    setYearRange: (yearRange: [number, number]) => void;
    columnVisibilityKey: string;
}

const BpIcon = styled('span')(({ theme }) => ({
    borderRadius: 3,
    width: 16,
    height: 16,
    boxShadow:
        theme.palette.mode === 'dark'
            ? '0 0 0 1px rgb(16 22 26 / 40%)'
            : 'inset 0 0 0 1px rgba(16,22,26,.2), inset 0 -1px 0 rgba(16,22,26,.1)',
    backgroundColor: theme.palette.mode === 'dark' ? '#394b59' : '#f5f8fa',
    backgroundImage:
        theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg,hsla(0,0%,100%,.05),hsla(0,0%,100%,0))'
            : 'linear-gradient(180deg,hsla(0,0%,100%,.8),hsla(0,0%,100%,0))',
    '.Mui-focusVisible &': {
        outline: '2px auto rgba(19,124,189,.6)',
        outlineOffset: 2,
    },
    'input:hover ~ &': {
        backgroundColor: theme.palette.mode === 'dark' ? '#30404d' : '#ebf1f5',
    },
    'input:disabled ~ &': {
        boxShadow: 'none',
        background:
            theme.palette.mode === 'dark'
                ? 'rgba(57,75,89,.5)'
                : 'rgba(206,217,224,.5)',
    },
}));

const BpCheckedIcon = styled(BpIcon)({
    backgroundColor: '#546DE5',
    backgroundImage:
        'linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0))',
    '&:before': {
        display: 'block',
        width: 16,
        height: 16,
        backgroundImage:
            "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath" +
            " fill-rule='evenodd' clip-rule='evenodd' d='M12 5c-.28 0-.53.11-.71.29L7 9.59l-2.29-2.3a1.003 " +
            "1.003 0 00-1.42 1.42l3 3c.18.18.43.29.71.29s.53-.11.71-.29l5-5A1.003 1.003 0 0012 5z' fill='%23fff'/%3E%3C/svg%3E\")",
        content: '""',
    },
    'input:hover ~ &': {
        backgroundColor: '#4356ba',
    },
});

function BpCheckbox(props: CheckboxProps) {
    return (
        <Checkbox
            sx={{
                '&:hover': { bgcolor: 'transparent' },
            }}
            disableRipple
            color="default"
            checkedIcon={<BpCheckedIcon />}
            icon={<BpIcon />}
            inputProps={{ 'aria-label': 'Checkbox demo' }}
            {...props}
        />
    );
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

            // Store in localStorage
            localStorage.setItem(
                props.columnVisibilityKey,
                JSON.stringify(Array.from(newColumnVisibility)),
            );
        };

    const [shownYearRange, setShownYearRange] = useState<[number, number]>([
        ...props.yearRange,
    ]);
    const debouncedSetYearRange = useCallback(
        debounce(
            (v: [number, number]) => {
                props.setYearRange(v);
            },
            3000,
            { leading: false, trailing: true },
        ),
        [props.setYearRange],
    );

    const setShownYearRangeAndUpdate = (v: [number, number]) => {
        setShownYearRange(v);
        debouncedSetYearRange(v);
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
                                <div>
                                    <div style={{ padding: '1rem' }}>
                                        <YearRangeSlider
                                            yearRange={shownYearRange}
                                            setYearRange={
                                                setShownYearRangeAndUpdate
                                            }
                                        />
                                    </div>
                                    <FormGroup
                                        style={{ paddingBottom: '0.53rem' }}
                                    >
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
                                                            <BpCheckbox
                                                                checked={
                                                                    visible
                                                                }
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
                                </div>
                            }
                        >
                            <FontAwesomeIcon
                                icon={faCog}
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
