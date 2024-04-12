import { enableSkipping } from "app/page";
import styles from "styled-components";

const HeaderContainer = styles.header``;

const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
        enableSkipping();
        section.scrollIntoView({ behavior: "smooth" });
    }
};

const linksClass = "select-none text-gray-300 text-2xl px-5 hover:text-white hover:cursor-pointer transition-all text-bold ";
const boxClass = "border border-gray-400 bg-black bg-opacity-60 rounded-lg p-2 m-2";

export default function Header() {
    return (
        <HeaderContainer className="p-4 fixed z-50 flex justify-center items-center w-full left-auto right-auto">
            <span className={linksClass + boxClass} onClick={() => scrollToSection("main")}>
                Hanami
            </span>
            <span className={linksClass + boxClass} onClick={() => scrollToSection("commands")}>
                Commands
            </span>
            <span className={linksClass + boxClass} onClick={() => scrollToSection("support")}>
                Support me
            </span>
        </HeaderContainer>
    );
}
