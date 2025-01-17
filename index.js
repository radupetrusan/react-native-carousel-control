"use strict";

import React, { Component } from "react";
import PropTypes from "prop-types";
import {
  Dimensions,
  I18nManager,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View
} from "react-native";

import styles from "./styles";

const { width } = Dimensions.get("window");

export default class Carousel extends Component {
  displayName = "Carousel";

  static propTypes = {
    pageStyle: PropTypes.object,
    pageWidth: PropTypes.number,
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node
    ]).isRequired,
    initialPage: PropTypes.number,
    containerStyle: PropTypes.object,
    noItemsText: PropTypes.string,
    onPageChange: PropTypes.func,
    sneak: PropTypes.number,
    transitionDelay: PropTypes.number,
    currentPage: PropTypes.number,
    swipeThreshold: PropTypes.number
  };

  static defaultProps = {
    initialPage: 0,
    pageStyle: null,
    containerStyle: null,
    pageWidth: width - 80,
    sneak: 20,
    noItemsText: "Sorry, there are currently \n no items available",
    transitionDelay: 0,
    currentPage: 0,
    swipeThreshold: 0.5
  };

  constructor(props) {
    super(props);

    this.state = {
      gap: undefined,
      currentPage: props.currentPage
    };

    this._scrollTimeout = null;

    this._resetScrollPosition = this._resetScrollPosition.bind(this);
    this._handleScrollEnd = this._handleScrollEnd.bind(this);
  }

  componentWillMount() {
    this._calculateGap(this.props);
  }

  componentDidMount() {
    this._resetScrollPosition(false);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      currentPage: nextProps.currentPage
    });

    this._calculateGap(nextProps);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.currentPage !== this.props.currentPage) {
      this._resetScrollPosition();
      this._onPageChange(this.props.currentPage);
    } else if (prevState.currentPage !== this.state.currentPage) {
      this._resetScrollPosition();
      this._onPageChange(this.state.currentPage);
    }
  }

  componentWillUnmount() {
    if (this._scrollTimeout) {
      clearTimeout(this._scrollTimeout);
    }
  }

  _getPageOffset() {
    const { pageWidth } = this.props;

    const { gap } = this.state;

    return pageWidth + gap;
  }

  _getPageScrollX(pageIndex) {
    return pageIndex * this._getPageOffset();
  }

  _getPagesCount() {
    return React.Children.count(this.props.children);
  }

  _resetScrollPosition(animated = true) {
    // in android, you can't scroll directly in componentDidMount
    // (http://stackoverflow.com/questions/33208477/react-native-android-scrollview-scrollto-not-working)
    // however this doesn't work in android for some reason:
    // InteractionManager.runAfterInteractions(() => {
    //     this.scrollView.scrollTo({ y: 0, x: pagePosition}, true);
    //     console.log('scrollView.scrollTo x:', pagePosition);
    // });
    // So I was left with an arbitrary timeout.
    if (this._scrollTimeout) {
      clearTimeout(this._scrollTimeout);
    }
    this._scrollTimeout = setTimeout(() => {
      this.scrollView.scrollTo({
        x: this._getPageScrollX(this.state.currentPage),
        y: 0,
        animated
      });
      this._scrollTimeout = null;
    }, this.props.transitionDelay);
  }

  _calculateGap(props) {
    const { sneak, pageWidth } = props;
    if (pageWidth > width) {
      throw new Error("invalid pageWidth");
    }
    /*
         ------------
        |            |
        |-   ----   -|
        | | |    | | |
        | | |    | | |
        | | |    | | |
        |-   ----   -|
        |^-- sneak   |
        |         ^--- gap
         ------------

        */
    const gap = (width - 2 * sneak - pageWidth) / 2;
    const interval = width - gap - 2 * sneak;
    this.setState({ gap, interval });
  }

  _handleScrollEnd(e) {
    const { interval } = this.state;

    const currentScrollX = e.nativeEvent.contentOffset.x;

    const currentPageIndex = currentScrollX / interval;
    this.setState({currentPage: currentPageIndex});
  }

  _onPageChange(position) {
    if (this.props.onPageChange) {
      const currentElement = this.props.children[position];
      this.props.onPageChange(position, currentElement);
    }
  }

  render() {
    const { sneak, pageWidth } = this.props;
    const { gap, interval } = this.state;
    const computedStyles = StyleSheet.create({
      scrollView: {
        paddingLeft: sneak + gap / 2,
        paddingRight: sneak + gap / 2
      },
      page: {
        width: pageWidth,
        justifyContent: "center",
        marginLeft: gap / 2,
        marginRight: gap / 2,
      }
    });

    // if no children render a no items dummy page without callbacks
    let body = null;
    if (!this.props.children) {
      body = (
        <TouchableWithoutFeedback>
          <View
            style={[styles.page, computedStyles.page, this.props.pageStyle]}
          >
            <Text style={styles.noItemsText}>{this.props.noItemsText}</Text>
          </View>
        </TouchableWithoutFeedback>
      );
    } else {
      const children = Array.isArray(this.props.children)
        ? this.props.children
        : [this.props.children];
      body = children.map((c, index) => {
        return (
          <TouchableWithoutFeedback
            key={index}
            onPress={() => this.setState({ currentPage: index })}
          >
            <View
              style={[
                styles.page,
                computedStyles.page,
                this.props.pageStyle,
              ]}
            >
              {c}
            </View>
          </TouchableWithoutFeedback>
        );
      });
    }

    return (
      <View style={[styles.container, this.props.containerStyle]}>
        <ScrollView
          automaticallyAdjustContentInsets={false}
          bounces
          scrollEnabled
          contentContainerStyle={[computedStyles.scrollView]}
          style={{
            flexDirection:
              I18nManager && I18nManager.isRTL ? "row-reverse" : "row"
          }}
          decelerationRate={0.9}
          horizontal
          onMomentumScrollEnd={this._handleScrollEnd}
          snapToInterval={interval}
          ref={c => (this.scrollView = c)}
          showsHorizontalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      </View>
    );
  }
}
