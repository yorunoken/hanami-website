import { CardProps } from "types";
import { Command } from "./Command";

export const Card = ({ title, children, commands, descriptions, titleLeft }: CardProps) => {
    return (
        <div className="items-center grid grid-cols-3 bg-dark bg-opacity-50 border border-blue-500 p-8 rounded-lg transition-all duration-300 hover:cursor-default">
            {titleLeft ? (
                <>
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <p className="text-base">{children}</p>
                    <div className="flex justify-center gap-4 items-center pt-4">
                        {commands.map((command, index) => {
                            const description = descriptions[index];
                            return <Command key={index} name={command} description={description} />;
                        })}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex justify-center gap-4 items-center pt-4">
                        {commands.map((command, index) => {
                            const description = descriptions[index];
                            return <Command key={index} name={command} description={description} />;
                        })}
                    </div>
                    <p className="text-base">{children}</p>
                    <h2 className="text-xl font-semibold">{title}</h2>
                </>
            )}
        </div>
    );
};
