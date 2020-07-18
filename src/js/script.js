const doc = document;
const codeInput = doc.querySelector(`.gnr-code-input`);
const treeContent = doc.querySelector(`.gnr-tree__content`);
const treePlaceHolder = doc.querySelector(`.gnr-tree__placeholder`);
const rangeDeep = doc.querySelector(`.gnr-deep__range`);
const valDeep = doc.querySelector(`.gnr-deep__digit`);
let maxDeep = 1;
const bemMessage = doc.querySelector(`.gnr-message--bem`);
const headersMessage = doc.querySelector(`.gnr-message--headers`);
const headersMessageContent = doc.querySelector(`.gnr-message--headers .gnr-message__content`);
const headersMessageTree = doc.querySelector(`.gnr-message--headers-tree`);
const headersMessageTreeContent = doc.querySelector(`.gnr-message--headers-tree .gnr-message__content`);
let headersLevels = {};
const headersOrder = [`H1`, `H2`, `H3`, `H4`, `H5`, `H6`];
let headersList = [];
let isWHolePage = false;
let hasBemWarning = false;
let bodyClass = ``;

const wholePageMarkers = [`META`, `TITLE`, `LINK`];
const skippedTags = [`SCRIPT`, `META`, `TITLE`, `LINK`, `NOSCRIPT`, `BR`];

const highlightColorNum = 0;

const styleElem = doc.createElement(`style`);
doc.head.appendChild(styleElem);

// DEV ONLY
// Add to textarea code for easy testing
// runDev();

// ------------------------------

codeInput.oninput = function () {
  setHeadersDefs();
  isWHolePage = false;
  hasBemWarning = false;
  maxDeep = 1;

  headersMessage.classList.add(`gnr-hidden`);
  headersMessageTree.classList.add(`gnr-hidden`);
  bemMessage.classList.add(`gnr-hidden`);

  createTreeFromHTML(this.value);

  addClassesActions();
};

// ------------------------------

function setHeadersDefs () {
  headersLevels = {
    H1: false,
    H2: false,
    H3: false,
    H4: false,
    H5: false,
    H6: false
    };

  headersList = [];
}

// ------------------------------

function createTreeFromHTML (code) {
  const codeOutput = document.createElement(`div`);

  if (!code) {
    treeContent.classList.add(`gnr-hidden`);
    treePlaceHolder.classList.remove(`gnr-hidden`);
    setRange();
    return;
  }

  // Fix for minified code
  code = code.replace(/></g, `>\n<`);

  bodyClass = getBodyClass(code);

  if (bodyClass) {
    bodyClass.forEach(function (item) {
      item && codeOutput.classList.add(item);
    });
  }
  codeOutput.innerHTML = code;

  const items = makeList(codeOutput, 1);

  if (treeContent.childElementCount > 0) {
    treeContent.removeChild(treeContent.firstElementChild);
  }

  const list = doc.createElement(`ul`);
  list.classList.add(`gnr-level`, `gnr-level--0`);
  list.appendChild(items);
  treeContent.appendChild(list);

  treeContent.classList.remove(`gnr-hidden`);
  treePlaceHolder.classList.add(`gnr-hidden`);

  setRange();

  showCodeErrors();
}

// ------------------------------

function makeList (elem, level) {
  const item = doc.createElement(`li`);
  item.classList.add(`gnr-level__item`);
  let tagName = elem.tagName;
  // elem.className not appropriate for svg
  const className = elem.classList.value;
  elem.classList.forEach = [].forEach;
  elem.children.forEach = [].forEach;

  if (!elem.customDataSet) {
    elem.customDataSet = {
      prefixes: {},
      level: level
    };
  }

  if (level === 1) {
    tagName = `BODY`;
  }

  const liContent = doc.createElement(`div`);
  liContent.classList.add(`gnr-level__elem`, `gnr-elem`);

  const tagSpan = doc.createElement(`span`);
  tagSpan.classList.add(`gnr-elem__tag`);
  tagSpan.innerHTML = tagName;

  // Check headers levels
  if (headersLevels[tagName] !== undefined) {
    headersLevels[tagName] = true;
    headersList.push({
      tagName: tagName,
      text: elem.innerText
    });
  }

  liContent.appendChild(tagSpan);

  addClassesAsPrefixes(elem);

  if (className) {
    checkBemForElem(elem);

    const classSpan = doc.createElement(`span`);
    classSpan.classList.add(`gnr-elem__class`, `gnr-class`);

    elem.classList.forEach(function (classItem, i) {
      const classItemSpan = doc.createElement(`span`);
      classItemSpan.classList.add(`gnr-class__item`);
      classItemSpan.innerHTML += classItem;

      // Check valid Bem naiming
      if (elem.classList.validBem &&
           elem.classList.validBem[classItem] === false) {
        classItemSpan.classList.add(`gnr-highlight-bem`);
      }

      classSpan.appendChild(classItemSpan);

      if (i < elem.classList.length - 1) {
        classSpan.innerHTML += ` `;
      }
    });

    const classDotSpan = doc.createElement(`span`);
    classDotSpan.classList.add(`gnr-class__dot`);
    classDotSpan.innerHTML = `.`;
    liContent.appendChild(classDotSpan);

    liContent.appendChild(classSpan);
  }

  item.appendChild(liContent);

  if (elem.children) {
    const childrenList = doc.createElement(`ul`);
    childrenList.classList.add(`gnr-level`, `gnr-level--${level}`);

    level++;

    elem.children.forEach(function (child) {
      checkIsWholePage(child);

      if (!checkIsSkippedTag(child)) {
        const newElem = makeList(child, level);

        if (newElem) {
          childrenList.appendChild(newElem);
        }
      }
    });

    if (childrenList.children.length > 0) {
      if (level > maxDeep) {
        maxDeep = level;
      }

      item.appendChild(childrenList);
    }
  }

  return item;
}

// ------------------------------

function addClassesActions () {
  const colors = [`aqua`, `lime`, `yellow`, `fuchsia`];

  const classItemSpanList = document.querySelectorAll(`.gnr-class__item`);

  classItemSpanList.forEach(function (classItemSpan) {
    classItemSpan.onclick = function () {
      let color = colors[highlightColorNum];

      if (this.dataset.color && this.dataset.color !== ``) {
        color = ``;
      }

      this.dataset.color = color;
    };
  });
}

// ------------------------------

function checkBemForElem (elem) {
  // elem.className not appropriate for svg
  const className = elem.classList.value;
  elem.classList.forEach = [].forEach;

  if (className.indexOf(`__`) < 0 &&
       className.indexOf(`--`) < 0) {
    return;
  }

  elem.classList.validBem = {};
  elem.classList.forEach(function (classItem) {
    // Check first part of class with __ (block name)
    if (classItem.split(`__`).length > 1) {
      let prefixCorrect = false;
      const prefix = classItem.split(`__`)[0];

      if (elem.customDataSet.prefixes[prefix]) {
        prefixCorrect = true;
      }

      elem.classList.validBem[classItem] = prefixCorrect;

      if (!prefixCorrect) {
        hasBemWarning = true;
      }
    }

    // Check first part of class with -- (modificator)
    if (classItem.split(`--`).length > 1) {
      let modifPrefixCorrect = false;
      const modifPrefix = classItem.split(`--`)[0];

      if (elem.classList.contains(modifPrefix)) {
        modifPrefixCorrect = true;
      }

      elem.classList.validBem[classItem] = modifPrefixCorrect;

      if (!modifPrefixCorrect) {
        hasBemWarning = true;
      }
    }
  });
}

// ------------------------------

function addClassesAsPrefixes (elem) {
  const classList = elem.classList;
  classList.forEach = [].forEach;

  copyPrefixes(elem);

  classList.forEach(function (classItem) {
    // Copy only block names
    if (classItem.split(`__`).length === 1 &&
         classItem.split(`--`).length === 1) {
      elem.customDataSet.prefixes[classItem] = classItem;
    }
  });
}

// ------------------------------

function copyPrefixes (elem) {
  const parent = elem.parentNode;

  if (!parent) {
    return;
  }

  for (const prefix in parent.customDataSet.prefixes) {
    elem.customDataSet.prefixes[prefix] = prefix;
  }
}

// ------------------------------

function setRange () {
  rangeDeep.max = maxDeep;
  rangeDeep.value = maxDeep;
  valDeep.innerHTML = maxDeep;
}

// ------------------------------

rangeDeep.oninput = function () {
  const level = +this.value;
  const styles = `.gnr-level--${level} { display: none }`;
  styleElem.innerHTML = styles;
  valDeep.innerHTML = this.value;
};

// ------------------------------

function showCodeErrors () {
  showBemMessage();
  checkHeadersLevels();
  printHeadersTree();
}

// ------------------------------

function showBemMessage () {
  bemMessage.classList.toggle(`gnr-hidden`, !hasBemWarning);
}

// ------------------------------

function checkHeadersLevels () {
  let isWrongOrder = false;
  const realOrder = doc.createElement(`dl`);
  realOrder.classList.add(`headers__list`);
  let maxUsedHeaders = 0;
  let tempHeadersStack = 0;
  let longestHeadersStack = 0;

  const realOrderDt = doc.createElement(`dt`);
  realOrderDt.classList.add(`headers__title`);
  realOrderDt.innerHTML = headersMessageContent.dataset.text;
  realOrder.appendChild(realOrderDt);

  for (const key in headersLevels) {
    if (headersLevels[key]) {
      maxUsedHeaders++;
      tempHeadersStack++;
    } else {
      if (longestHeadersStack < tempHeadersStack) {
        longestHeadersStack = tempHeadersStack;
      }
      tempHeadersStack = 0;
    }
  }

  if (maxUsedHeaders > longestHeadersStack) {
    isWrongOrder = true;
  } else if (isWHolePage && !headersLevels.H1) {
   isWrongOrder = true;
  }

  if (isWrongOrder) {
    headersOrder.forEach(function (headerItem) {
      const headerItemSpan = doc.createElement(`dd`);
      headerItemSpan.classList.add(`headers__item`);
      headerItemSpan.innerHTML = headerItem;

      if (headersLevels[headerItem]) {
        headerItemSpan.classList.add(`headers__item--found`);
      } else {
        headerItemSpan.classList.add(`headers__item--notfound`);
      }

      realOrder.appendChild(headerItemSpan);
    });

    if (headersMessageContent.firstChild) {
      headersMessageContent.removeChild(headersMessageContent.firstChild);
    }
    headersMessageContent.appendChild(realOrder);
  }

  headersMessage.classList.toggle(`gnr-hidden`, !isWrongOrder);
}

// ------------------------------

function printHeadersTree () {
  let out = ``;

  if (headersList.length === 0) {
    return;
  }

  for (let i = 0; i < headersList.length; i++) {
    const tag = headersList[i].tagName;
    const text = headersList[i].text;

    out += `<${tag}><span>${tag}</span> ${text}</${tag}>`;
  }

  headersMessageTreeContent.innerHTML = out;
  headersMessageTree.classList.remove(`gnr-hidden`);
}

// ------------------------------

function checkIsSkippedTag (elem) {
  return skippedTags.indexOf(elem.tagName) >= 0;
}

// ------------------------------

function checkIsWholePage (elem) {
  if (wholePageMarkers.indexOf(elem.tagName) >= 0) {
    isWHolePage = true;
  }
}

// ------------------------------

function getBodyClass (code) {
  const result = code.match(/<body[^>]*class="(.*)"/);

  if (result) {
    return result[1].split(` `);
  }

  return ``;
}

// ------------------------------

// eslint-disable-next-line no-unused-vars
function runDev () {
  const testMarkup = `<h1 class="page__title">Title</h1><div class="wrapper"><section class="prices1"><div><h2 class="prices__title">Title</h2><div class="prices__content prices__content--disabled">Content</div></div></section><section class="reviews"><div><h2 class="reviews__title">Title</h2><div class="reviews__content">Content</div></div></section><footer class="footer"><div><h2 class="footer__title">Footer Title</h2><div class="footer__content"><h4 class="footer__subtitle">Footer SubTitle</h4>Footer Content</div></div></footer></div></div>`;
  codeInput.value = testMarkup;
  setHeadersDefs();
  hasBemWarning = false;
  createTreeFromHTML(testMarkup);
  addClassesActions();
}
