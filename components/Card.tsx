import { CardProps } from "types";
import { Command } from "./Command";

export const Card = ({ title, children, commands, descriptions }: CardProps) => {
    return (
        <div className="bg-dark bg-opacity-50 border border-gray-300 p-4 sm:p-8 px-4 sm:px-16 rounded-lg transition-all duration-300 hover:cursor-default">
            <h2 className="text-lg sm:text-xl font-semibold mb-2">{title}</h2>
            <p className="text-base">{children}</p>
            <div className="flex gap-4 pt-4 justify-center">
                {commands.map((command, index) => {
                    const description = descriptions[index];
                    console.log(command, index);
                    return <Command key={index} name={command} description={description} />;
                })}
            </div>
        </div>
    );
};
