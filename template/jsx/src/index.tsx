import React from "react";

import styles from "./index.module.scss";

const Index: React.FC = (props) => {
    return (
        <div className={styles.mydiv}>
            <div>div</div>
            <span>span</span>
        </div>
    );
};

export { Index };
