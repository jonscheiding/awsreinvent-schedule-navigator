import React, { Component } from 'react';
import { DebounceInput } from 'react-debounce-input';
import Calendar from 'react-big-calendar';
import moment from 'moment';
import shortId from 'shortid';
import cx from 'classnames';
import { desaturate, darken, transparentize } from 'polished';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import './App.css'

import EventsStore, { COLOR_BY_OPTIONS } from './EventsStore';

const PST_OFFSET = 8 * 60;
const DEFAULT_DATE = new Date(2018, 10, 26);

const InputWithLabel = ({id, children, inline, float, title, ...props}) => {
  if(!id) {
    id = shortId();
  }

  return (
    <div title={title} className={cx('checkbox', { 'inline': inline, 'float': float })}>
      <input id={id} {...props} />
      <label htmlFor={id}>{children}</label>
    </div>
  )
}

class Collapsible extends Component {
  constructor(props) {
    super(props);
    this.state = { collapsed: props.defaultCollapsed === true };
  }

  render() {
    const { collapsible, title, buttons, children, className, defaultCollapsed, ...props } = this.props;
    const { collapsed } = this.state;

    return (
      <div className={cx(className, 'collapsible')} {...props}>
        <div className='header'>
          <button onClick={() => this.setState({collapsed: !collapsed})}>
            <div className='title'>{title}</div>
            <div className={cx('indicator', { collapsed, collapsible })} />
          </button>
          <div className='buttons'>{buttons}</div>
        </div>
        {collapsed && collapsible ? null : <div>{children}</div>}
      </div>
    );
  }
}

Collapsible.defaultProps = { collapsible: true };

class App extends Component {
  constructor() { super(); 
    this.eventStore = new EventsStore();
    this.state = {
      ...this.createStateFromStore(),
      visibleRange: this.calculateDateRange([DEFAULT_DATE])
    };

    this.calendarRef = React.createRef();
  }

  setStateFromStore() {
    const state = this.createStateFromStore();
    let { selectedEvent } = this.state;
    if(selectedEvent) {
      selectedEvent = state.events.find(e => e.id === selectedEvent.id);
    }

    this.setState({ ...state, selectedEvent });
  }

  createStateFromStore() {
    return {
      events: this.eventStore.getFilteredList(),
      topics: this.eventStore.topics,
      locations: this.eventStore.locations,
      types: this.eventStore.types,
      interested: this.eventStore.interested,
      colorBy: this.eventStore.colorBy,
      excludeNotInterested: this.eventStore.excludeNotInterested
    };
  }

  render() {
    return (
      <div className='main container' onKeyPress={this.handleKeyPress} tabIndex={0}>
        <div className='controls vertical container'>
          <div className='topics scrollable'>
            {this.renderChooser(this.state.topics, 'topic')}
          </div>
          <div className='types'>
            {this.renderChooser(this.state.types, 'type')}
          </div>
          <div className='locations'>
            {this.renderChooser(this.state.locations, 'location')}
          </div>
          <div className='search'>
            {this.renderSearch()}
          </div>
          <div className='options'>
            {this.renderOptions()}
          </div>
        </div>
        <div className='events vertical container'>
          <div className='calendar scrollable'>
            {this.renderCalendar()}
          </div>
          <div className='current-event scrollable'>
            {this.renderCurrentEvent()}
          </div>
        </div>
      </div>
    );
  }

  renderCalendar() {
    const accessors = {
      startAccessor: e => this.convertToEventLocalTime(e.start),
      endAccessor: e => this.convertToEventLocalTime(e.end),
      titleAccessor: e => e.abbreviation + ' ' + e.title,
      tooltipAccessor: e => e.abbreviation + ' ' + e.title
    };

    const handlers = {
      onDoubleClickEvent: this.handleEventDoubleClick,
      onSelectEvent: this.handleEventSelect,
      onRangeChange: this.handleRangeChange
    };

    const settings = {
      min: new Date(2018, 10, 25, 8, 0),
      max: new Date(2018, 10, 25, 21, 59, 59),
      step: 30,
      timeslots: 1,
      defaultDate: DEFAULT_DATE,
      defaultView: 'day',
      views: ['day', 'week', 'agenda'],
      localizer: Calendar.momentLocalizer(moment)
    };

    const components = {
      agenda: {
        event: (e) => this.renderEventDetails(e.event, true)
      }
    }

    return (
      <Calendar
        ref={this.calendarRef}
        events={this.state.events}
        eventPropGetter={this.getEventProps}
        selected={this.state.selectedEvent}
        components={components}
        {...settings}
        {...handlers}
        {...accessors}
        />
    );
  }

  renderCurrentEvent() {
    return (
      <div>
        {this.renderEventDetails(this.state.selectedEvent)}
        {this.renderEventNavigation()}
      </div>
    );
  }

  renderEventDetails(event, hideTimes = false) {
    if(!event) { 
      return null;
    }

    return (
      <div className='container event-details'>
        <div className='meta'>
          <div><b>{event.abbreviation} {event.title}</b></div>
          <div>{event.topic}</div>
          <div><i>{event.type}</i></div>
          { hideTimes ? null : 
            <div>
              {moment(this.convertToEventLocalTime(event.start)).format('h:mm a')} -
              {moment(this.convertToEventLocalTime(event.end)).format('h:mm a')}
            </div>
          }
          <div className='interested'>
            <InputWithLabel type='checkbox' title='Toggle Interested (\)'
              checked={this.state.interested[event.id]} 
              onChange={e => this.handleInterestedCheckboxChange(e, event)}>
              Interested
            </InputWithLabel>
          </div>
        </div>
        <div className='abstract'>
          <p>{event.abstract}</p>
        </div>
      </div>
    )
  }

  renderEventNavigation() {
    return (
      <div className="navigation">
        <button onClick={() => this.handleEventNavigation(-1)} title="Previous event ([)">Previous Event</button>
        <button onClick={() => this.handleEventNavigation(1)} title="Next Event (])">Next Event</button>
      </div>
    )
  }

  renderOptions() {
    return (
      <Collapsible title='Options' defaultCollapsed={true}>
        <div className='option'>
          <InputWithLabel type='checkbox' float
            checked={this.eventStore.alwaysShowInterested}
            onChange={this.handleAlwaysShowInterestedCheckboxChange}>
            Show all events that are marked as "interested", regardless of filters
          </InputWithLabel>
        </div>
        <div className='option'>
          <InputWithLabel type='checkbox' float
            checked={this.eventStore.hideNotInterested}
            onChange={this.handleHideNotInterestedCheckboxChange}>
            Hide events that are not marked as "interested"
          </InputWithLabel>
        </div>
        <div className='option'>
          <div>Color By:</div>
          {COLOR_BY_OPTIONS.map(option => (
            <InputWithLabel type='radio' inline
              radioGroup='color-by' value={option} key={option}
              checked={this.eventStore.colorBy === option}
              onChange={this.handleColorByRadioButtonChange}
              >
              <span className='title-case'>{option}</span>
            </InputWithLabel>
          ))}          
        </div>
      </Collapsible>
    )
  }

  renderSearch() {
    return (
      <Collapsible title='Search' defaultCollapsed={true}>
        <DebounceInput debounceTimeout={500}
          value={this.eventStore.searchText}
          onChange={this.handleSearchTextChange} />
      </Collapsible>
    );
  }

  renderChooser(choices, title) {
    const keys = Object.keys(choices).sort();
    
    const buttons = (
      <div>
        <button onClick={e => this.handleSelectAllOrNoneClick(e, choices)} value={true}>ALL</button>
        <button onClick={e => this.handleSelectAllOrNoneClick(e, choices)} value={false}>NONE</button>
      </div>
    );

    return (
      <Collapsible title={title} buttons={buttons} collapsible={title !== 'topic'}>
        {keys.map(key => this.renderChoice(choices[key], title))}
      </Collapsible>
    );
  }

  renderChoice(choice, title) {
    return (
      <div key={choice.value}>
        <InputWithLabel type='checkbox' 
          checked={choice.isIncluded}
          onChange={e => this.handleFilterCheckboxChange(e, choice)}>
          { this.state.colorBy === title
            ? <span className='color-label' style={{backgroundColor: choice.color}} />
            : null
          }
          {choice.value || <i>Unknown</i>}
        </InputWithLabel>
      </div>
    );
  }

  handleSearchTextChange = (e) => {
    this.eventStore.searchText = e.target.value;
    this.setStateFromStore();
  }

  handleColorByRadioButtonChange = (e) => {
    this.eventStore.colorBy = e.target.value;
    this.setStateFromStore();
  }

  handleAlwaysShowInterestedCheckboxChange = (e) => {
    this.eventStore.alwaysShowInterested = e.target.checked;
    this.setStateFromStore();
  }

  handleHideNotInterestedCheckboxChange = (e) => {
    this.eventStore.hideNotInterested = e.target.checked;
    this.setStateFromStore();
  }

  handleInterestedCheckboxChange = (e, event) => {
    this.eventStore.updateInterested(event, e.target.checked);
    this.setStateFromStore();
  }

  handleFilterCheckboxChange = (e, choice) => {
    this.eventStore.updateIncluded(choice, e.target.checked);
    this.setStateFromStore();
  }

  handleSelectAllOrNoneClick = (e, choices) => {
    for(const key of Object.keys(choices)) {
      this.eventStore.updateIncluded(choices[key], e.target.value === 'true');
    }
    this.setStateFromStore();
  }

  handleEventSelect = (event) => {
    this.setState({selectedEvent: event});
  }

  handleEventDoubleClick = (event) => {
    this.eventStore.updateInterested(event, !this.state.interested[event.id]);
    this.setStateFromStore();
    return false;
  }

  handleRangeChange = (dates) => {
    this.setState({ 
      visibleRange: this.calculateDateRange(dates)
    });
  }

  handleEventNavigation = (increment) => {
    const { selectedEvent, visibleRange } = this.state;

    const visibleEvents = this.state.events
      .filter(e => e.start >= visibleRange.start && e.end <= visibleRange.end)
      .sort((a, b) => a.start - b.start);

    if(!selectedEvent) {
      this.setState({selectedEvent: visibleEvents[0]});
      return;
    }

    const currentIndex = visibleEvents.indexOf(selectedEvent);
    let newIndex = currentIndex + increment;

    if(newIndex >= visibleEvents.length) {
      newIndex = 0;
    } else if (newIndex < 0) {
      newIndex = visibleEvents.length - 1;
    }

    this.setState({
      selectedEvent: visibleEvents[newIndex]
    });
  }

  handleKeyPress = (e) => {
    switch(e.key) {
      case '\\':
        if(!this.state.selectedEvent) { return false; }

        this.handleEventDoubleClick(this.state.selectedEvent);
        return false;
      case ']':
        this.handleEventNavigation(1);
        return false;
      case '[':
        this.handleEventNavigation(-1);
        return false;
      default:
        return true;
    }
  }

  convertToEventLocalTime = (date) => {
    if(!(date instanceof Date)) { return date; }
    
    const adjustment = PST_OFFSET - date.getTimezoneOffset();

    return moment(date).subtract({minutes: adjustment}).toDate();
  }

  calculateDateRange(dates) {
    const start = dates[0];
    const end = moment(dates[dates.length - 1]).add({days: 1}).toDate();

    return {start, end};
  } 

  getEventProps = (e, start, end, isSelected) => {
    let backgroundColor = desaturate(0.25, e.color);
    let borderColor = darken(0.2, backgroundColor);
    
    if(!isSelected) {
      backgroundColor = transparentize(0.2, backgroundColor);
    }

    return {
      className: cx('event', {
        'selected': isSelected,
        'interested': this.state.interested[e.id]
      }),
      style: {
        backgroundColor: backgroundColor,
        borderColor: borderColor,
      }
    };
  }
}

export default App;
