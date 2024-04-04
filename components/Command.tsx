import { CommandProps } from "types";

export const Command = ({ name }: CommandProps) => {
    return <p className="ring rounded-lg p-2 max-w-32">{name}</p>;
};
