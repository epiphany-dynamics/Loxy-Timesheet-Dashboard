import Image from 'next/image';
import Link from 'next/link';

export function Header() {
    return (
        <header className="w-full bg-white pt-2 pb-1">
            <div className="w-full px-4 flex justify-center">
                <Link href="/" className="relative w-full h-80 block">
                    {/* Desktop Logo */}
                    <div className="hidden md:block w-full h-full relative">
                        <Image
                            src="/logo-desktop.png"
                            alt="Grace Caretakers Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    {/* Mobile Logo */}
                    <div className="block md:hidden w-full h-full relative">
                        <Image
                            src="/logo-mobile.png"
                            alt="Grace Caretakers Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </Link>
            </div>
        </header>
    );
}
