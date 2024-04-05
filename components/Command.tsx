import { CommandProps } from "types";

export const Command = ({ name, description }: CommandProps) => {
    return (
        <div className="group relative">
            <span className="ring rounded-lg p-2 ring-blue-800 max-w-32" title={description}>
                {name}
            </span>
        </div>
    );
};
