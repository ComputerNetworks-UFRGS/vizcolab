import Slider from '@mui/material/Slider';

export default function RangeSlider({
    yearRange,
    setYearRange,
}: {
    yearRange: [number, number];
    setYearRange: (value: [number, number]) => void;
}) {
    const handleChange = (event: Event, newValue: number[] | number) => {
        setYearRange(newValue as [number, number]);
    };

    const marks = yearRange.map((year) => ({
        value: year,
        label: year.toString(),
    }));

    return (
        <div className="year-range-slider">
            <span>FAIXA DE ANOS:</span>
            <Slider
                value={yearRange}
                onChange={handleChange}
                valueLabelDisplay="auto"
                min={2017}
                max={2020}
                marks={marks}
                sx={{
                    color: '#546DE5',
                    '& .MuiSlider-markLabel': {
                        color: 'white',
                    },
                    '& .MuiSlider-rail': {
                        color: 'white',
                        opacity: 1,
                    },
                    // '& .MuiSlider-thumb': {
                    //     border: '5px solid white',
                    // },
                }}
            />
        </div>
    );
}
