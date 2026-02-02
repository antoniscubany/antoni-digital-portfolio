"use client";

import { Cloud, renderSimpleIcon, ICloud } from "react-icon-cloud";
import {
    siReact,
    siTypescript,
    siNextdotjs,
    siTailwindcss,
    siNodedotjs,
    siGit,
    siGithub,
    siVercel,
    siDocker,
    siPython,
    siLinux,
} from "simple-icons/icons";

const icons = [
    siReact,
    siTypescript,
    siNextdotjs,
    siTailwindcss,
    siNodedotjs,
    siGit,
    siGithub,
    siVercel,
    siDocker,
    siPython,
    siLinux,
];

const cloudProps: Omit<ICloud, "children"> = {
    containerProps: {
        style: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
        },
    },
    options: {
        reverse: true,
        depth: 1,
        wheelZoom: false,
        imageScale: 2,
        activeCursor: "default",
        tooltip: "native",
        initial: [0.02, -0.02],
        clickToFront: 500,
        tooltipDelay: 0,
        outlineColour: "#0000",
        maxSpeed: 0.01,
        minSpeed: 0.005,
    },
};

const renderCustomIcon = (icon: (typeof icons)[0]) => {
    return renderSimpleIcon({
        icon,
        minContrastRatio: 2,
        bgHex: "#020202",
        size: 42,
        fallbackHex: "#00f0ff",
        aProps: {
            href: undefined,
            target: undefined,
            rel: undefined,
            onClick: (e: React.MouseEvent) => e.preventDefault(),
        },
    });
};

export default function IconCloudSphere() {
    return (
        <div className="w-full h-full min-h-[350px] lg:min-h-[450px] flex items-center justify-center">
            <div className="w-full max-w-[500px] aspect-square">
                <Cloud {...cloudProps}>
                    {icons.map((icon) => renderCustomIcon(icon))}
                </Cloud>
            </div>
        </div>
    );
}
