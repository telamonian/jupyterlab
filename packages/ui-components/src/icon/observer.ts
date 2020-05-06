// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// import { LabIcon } from './labicon';

// export function LabIconObserver(root: HTMLElement) {
//   const mo = new MutationObserver(function (mutationRecords) {
//     mutationRecords.forEach(function (mutationRecord) {
//       if (mutationRecord.type === 'childList' && mutationRecord.addedNodes.length > 0) {
//         treeCallback(mutationRecord.target);
//       }

//       if (mutationRecord.type === 'attributes' && isWatched(mutationRecord.target) && ~ATTRIBUTES_WATCHED_FOR_MUTATION.indexOf(mutationRecord.attributeName)) {
//         if (mutationRecord.attributeName === 'class') {
//         var _getCanonicalIcon = getCanonicalIcon(classArray(mutationRecord.target)),
//           prefix = _getCanonicalIcon.prefix,
//           iconName = _getCanonicalIcon.iconName;

//         if (prefix) mutationRecord.target.setAttribute('data-prefix', prefix);
//         if (iconName) mutationRecord.target.setAttribute('data-icon', iconName);
//         } else {
//         nodeCallback(mutationRecord.target);
//         }
//       }
//       });
//   });
// }
