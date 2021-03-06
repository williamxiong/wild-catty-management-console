import { computed, h, defineComponent, ref, PropType, inject } from 'vue';
import isFunction from 'lodash/isFunction';
import { CaretRightSmallIcon } from 'tdesign-icons-vue-next';
import TCheckBox from '../checkbox';
import TLoading from '../loading';

import { getTNode } from './util';
import { TypeEventState, TreeNodeModel } from './interface';
import { useCLASSNAMES, injectKey } from './constants';
import TreeNode from '../_common/js/tree/tree-node';

import useRipple from '../hooks/useRipple';
import { useConfig } from '../hooks/useConfig';

export default defineComponent({
  name: 'TTreeNode',
  props: {
    node: {
      type: Object as PropType<TreeNode>,
    },
    onClick: Function as PropType<(e: TypeEventState) => void>,
    onChange: Function as PropType<(e: TypeEventState) => void>,
  },
  setup(props) {
    const treeScope = inject(injectKey);
    const label = ref<HTMLElement>();
    useRipple(label);

    const CLASS_NAMES = useCLASSNAMES();

    const { global } = useConfig('tree');

    const handleClick = (evt: MouseEvent) => {
      const { node } = props;
      const state: TypeEventState = {
        mouseEvent: evt,
        event: evt,
        node,
        path: node.getPath(),
      };
      props.onClick?.(state);
    };

    const handleChange = () => {
      const { node } = props;
      const event = new Event('change');
      const state: TypeEventState = {
        event,
        node,
      };
      props.onChange?.(state);
    };

    const itemStyles = computed(() => {
      const { level } = props.node;
      const styles = `--level: ${level};`;
      return styles;
    });

    const itemClassList = computed(() => {
      const { node } = props;
      const list = [];
      list.push(CLASS_NAMES.value.treeNode);
      list.push({
        [CLASS_NAMES.value.treeNodeOpen]: node.expanded,
        [CLASS_NAMES.value.actived]: node.isActivable() ? node.actived : false,
        [CLASS_NAMES.value.disabled]: node.isDisabled(),
      });
      return list;
    });

    const renderLine = () => {
      const { node } = props;
      const { line, scopedSlots } = treeScope.value;
      const iconVisible = !!treeScope.value.icon;

      let lineNode = null;
      if (line === true) {
        if (scopedSlots?.line) {
          lineNode = scopedSlots.line({
            node: node?.getModel(),
          });
        } else if (node.parent && node.tree) {
          const { vmIsLeaf, vmIsFirst, level } = node;

          const lineClasses = [];

          // ?????????????????????????????????????????????
          lineClasses.push(CLASS_NAMES.value.line);

          // ???????????????????????????????????????????????? icon ??????
          // ???????????????icon ???????????????????????????????????????
          if (vmIsLeaf || !iconVisible) {
            lineClasses.push(CLASS_NAMES.value.lineIsLeaf);
          }

          // ????????????????????????????????????????????????????????????????????? icon ??????
          // ?????? icon ???????????????????????????????????????
          if (vmIsFirst && iconVisible) {
            lineClasses.push(CLASS_NAMES.value.lineIsFirst);
          }

          // ????????????????????????????????????????????????
          // ??????????????????????????????
          const shadowStyles: string[] = [];
          const parents = node.getParents();
          parents.pop();
          parents.forEach((pNode: TreeNode, index: number) => {
            if (!pNode.vmIsLast) {
              shadowStyles.push(`calc(-${index + 1} * var(--space)) 0 var(--color)`);
            }
          });

          const styles = {
            '--level': level,
            'box-shadow': shadowStyles.join(','),
          };

          lineNode = <span class={lineClasses} style={styles}></span>;
        }
      } else {
        lineNode = getTNode(line, {
          node,
        });
      }
      return lineNode;
    };

    const renderIcon = () => {
      const getFolderIcon = () => {
        if (isFunction(global.value.folderIcon)) {
          return global.value.folderIcon(h);
        }
        return <CaretRightSmallIcon />;
      };

      const { node } = props;
      const { icon, scopedSlots } = treeScope.value;
      let isDefaultIcon = false;

      let iconNode = null;
      if (icon === true) {
        if (scopedSlots?.icon) {
          iconNode = scopedSlots.icon({
            node: node?.getModel(),
          });
        } else if (!node.vmIsLeaf) {
          isDefaultIcon = true;
          iconNode = getFolderIcon();
          if (node.loading && node.expanded) {
            iconNode = <TLoading />;
          }
        } else {
          iconNode = '';
        }
      } else {
        iconNode = getTNode(icon, {
          node,
        });
      }
      iconNode = (
        <span
          class={[
            CLASS_NAMES.value.treeIcon,
            CLASS_NAMES.value.folderIcon,
            isDefaultIcon ? CLASS_NAMES.value.treeIconDefault : '',
          ]}
          trigger="expand"
          ignore="active"
        >
          {iconNode}
        </span>
      );

      return iconNode;
    };

    const renderLabel = () => {
      const { node } = props;
      const { label, scopedSlots, disableCheck } = treeScope.value;
      const checkProps = treeScope.value.checkProps || {};

      let labelNode = null;
      if (label === true) {
        if (scopedSlots.label) {
          labelNode = scopedSlots.label({
            node: node.getModel(),
          });
        } else {
          labelNode = node.label || '';
        }
      } else {
        labelNode = getTNode(label, {
          node,
        });
      }

      const labelClasses = [
        CLASS_NAMES.value.treeLabel,
        CLASS_NAMES.value.treeLabelStrictly,
        {
          [CLASS_NAMES.value.actived]: node.isActivable() ? node.actived : false,
        },
      ];

      if (node.vmCheckable) {
        let checkboxDisabled = false;
        if (typeof disableCheck === 'function') {
          checkboxDisabled = disableCheck(node as TreeNodeModel & TreeNode);
        } else {
          checkboxDisabled = !!disableCheck;
        }
        if (node.isDisabled()) {
          checkboxDisabled = true;
        }
        const itemCheckProps = {
          ...checkProps,
          disabled: checkboxDisabled,
        };

        labelNode = (
          <TCheckBox
            class={labelClasses}
            checked={node.checked}
            indeterminate={node.indeterminate}
            disabled={node.isDisabled()}
            name={node.value}
            onChange={() => handleChange()}
            ignore="expand,active"
            needRipple={true}
            {...itemCheckProps}
          >
            {labelNode}
          </TCheckBox>
        );
      } else {
        const inner = <span style="position: relative">{labelNode}</span>;
        labelNode = node.isActivable() ? ( // ??????key????????????????????????????????????????????????ripple??????
          <span key="1" ref="label" class={labelClasses}>
            {inner}
          </span>
        ) : (
          <span key="2" class={labelClasses}>
            {inner}
          </span>
        );
      }

      return labelNode;
    };

    const renderOperations = () => {
      const { node } = props;
      const { operations, scopedSlots } = treeScope.value;

      let opNode = null;
      if (scopedSlots?.operations) {
        opNode = scopedSlots.operations({
          node: node?.getModel(),
        });
      } else {
        opNode = getTNode(operations, {
          node,
        });
      }
      if (opNode) {
        opNode = (
          <span class={CLASS_NAMES.value.treeOperations} ignore="active,expand">
            {opNode}
          </span>
        );
      }
      return opNode;
    };

    return () => {
      const { node } = props;

      return (
        <div
          class={itemClassList.value}
          data-value={node.value}
          data-level={node.level}
          style={itemStyles.value}
          onClick={(evt: MouseEvent) => handleClick(evt)}
        >
          {renderLine()}
          {renderIcon()}
          {renderLabel()}
          {renderOperations()}
        </div>
      );
    };
  },
});
