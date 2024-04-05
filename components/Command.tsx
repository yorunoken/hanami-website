import { CommandProps } from "types";

export const Command = ({ name, description }: CommandProps) => {
    return (
        <div className="group relative">
            <span className="rounded-lg p-2 bg-command-box max-w-32" title={description}>
                {name}
            </span>
        </div>
    );
};
