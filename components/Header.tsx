import styles from "styled-components";
import Link from "next/link";

const HeaderContainer = styles.header``;

const linksClass = "text-white text-lg px-5 hover:text-gray-300 hover:text-xl transition-all";

export default function Header() {
    return (
        <HeaderContainer className="bg-opacity-80 bg-black flex justify-center items-center backdrop-blur-md p-4 fixed top-0 left-0 w-full z-50">
            <Link href={"#"} className={linksClass}>
                Home
            </Link>
            <Link href={"#features"} className={linksClass}>
                Features
            </Link>
            <Link href={"#support-me"} className={linksClass}>
                Support me
            </Link>
        </HeaderContainer>
    );
}
