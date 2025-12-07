interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    className?: string;
}

export default function NumberInput({ className, ...props }: NumberInputProps) {
    return (
        <input
            type='number'
            onWheel={(e) => e.currentTarget.blur()}
            onKeyDown={(e) => {
                if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
                    e.preventDefault();
                }
            }}
            className={`
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:appearance-none 
                ${className}
            `}
            {...props}
        />
    );
}
