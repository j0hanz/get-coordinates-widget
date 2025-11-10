/** @jsx jsx */
import { hooks, jsx, React } from "jimu-core";
import {
  SettingRow,
  SettingSection,
} from "jimu-ui/advanced/setting-components";
import { Button, Icon } from "jimu-ui";
import { createStyleVariantSelectorStyles, StyleVariant } from "../../config";
import type { StyleVariantSelectorProps } from "../../config";
import defaultMessages from "../translations/default";

const StyleVariantSelector = (props: StyleVariantSelectorProps) => {
  const translate = hooks.useTranslation(defaultMessages);
  const { config, id, onSettingChange, currentVariant } = props;

  const stylesRef = React.useRef(null);
  let styles = stylesRef.current;
  if (!styles) {
    styles = createStyleVariantSelectorStyles();
    stylesRef.current = styles;
  }

  const handleStyleVariantChange = hooks.useEventCallback(
    (variant: StyleVariant) => {
      onSettingChange({
        id,
        config: config.set("styleVariant", variant),
      });
    }
  );

  const isDefaultActive = currentVariant === StyleVariant.Default;
  const isLinearActive = currentVariant === StyleVariant.Linear;

  return (
    <SettingSection title={translate("settingStyleVariant")}>
      <SettingRow>
        <div
          aria-label={translate("settingStyleVariant")}
          role="radiogroup"
          css={styles.container}
        >
          <Button
            type="tertiary"
            role="radio"
            block
            css={[styles.button, isDefaultActive && styles.buttonActive]}
            onClick={() => handleStyleVariantChange(StyleVariant.Default)}
            title={translate("styleVariantDefault")}
            aria-label={translate("styleVariantDefault")}
            aria-checked={isDefaultActive}
          >
            <Icon
              className="style-img"
              css={styles.styleImg}
              icon={require("../../assets/style-coordinate.svg")}
            />
          </Button>
          <Button
            type="tertiary"
            role="radio"
            block
            css={[styles.button, isLinearActive && styles.buttonActive]}
            onClick={() => handleStyleVariantChange(StyleVariant.Linear)}
            title={translate("styleVariantLinear")}
            aria-label={translate("styleVariantLinear")}
            aria-checked={isLinearActive}
          >
            <Icon
              className="style-img"
              css={styles.styleImg}
              icon={require("../../assets/style-coordinate-liner.svg")}
            />
          </Button>
        </div>
      </SettingRow>
    </SettingSection>
  );
};

export default StyleVariantSelector;
